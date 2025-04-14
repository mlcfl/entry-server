import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import vhost from "vhost";
import { getApps } from "./utils";
import config from "../config.json" assert { type: "json" };

import "dotenv/config";

const port = process.env.PORT;
const server = express();

const loadApps = async () => {
	const appsDir = resolve(config.appsDir);
	const appFolders = await getApps(appsDir);

	try {
		for (const appFolder of appFolders) {
			try {
				const appPath = join(
					appsDir,
					`${appFolder}/${appFolder}-backend/dist`,
					config.appEntryFile
				);

				if (!existsSync(appPath)) {
					continue;
				}

				const path = pathToFileURL(appPath).href;
				const appModule = await import(path);
				const app = await appModule.server();
				const subdomain = `${appFolder}.mlc.local`;
				server.use(vhost(subdomain, app));
				console.log(`Application ${appFolder} on subdomain ${subdomain}`);

				// Temp default route
				if (appFolder === config.defaultApp) {
					server.use(vhost("mlc.local", app));
					console.log(`Application ${appFolder} on default route`);
				}
			} catch (e) {
				console.error(`Error loading application ${appFolder}:`, e);
			}
		}
	} catch (e) {
		console.error("Error loading applications:", e);
	}
};

loadApps().then(() => {
	server.listen(port, () => {
		console.log(`Server running on port ${port}`);
	});
});
