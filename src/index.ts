import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import vhost from "vhost";
import { getApps } from "./utils";
import config from "../config.json" assert { type: "json" };

import "dotenv/config";

const port = process.env.PORT ?? 7300;
const serverMode = process.env.SERVER_MODE ?? "localhost";
const server = express();

const loadApps = async () => {
	const appsDir = resolve(config.appsDir);
	const appFolders = await getApps(appsDir);

	if (!appFolders.length) {
		console.warn(
			`No applications found to load. Check the apps directory:\n${appsDir}`
		);
		process.exit(1);
	}

	for (const appFolder of appFolders) {
		try {
			const appPath = join(
				appsDir,
				`${appFolder}/${appFolder}-backend/dist`,
				config.appEntryFile
			);

			if (!existsSync(appPath)) {
				console.info(
					`Application entry file not found for "${appFolder}". The build may not have been completed. Skipping...`
				);
				continue;
			}

			const path = pathToFileURL(appPath).href;
			const appModule = await import(path);
			const app = await appModule.server();
			const subdomain = `${appFolder}.${serverMode}`;

			// Subdomain routes
			server.use(vhost(subdomain, app));
			console.log(`Application ${appFolder} on subdomain ${subdomain}`);

			// Default route
			if (appFolder === config.defaultApp) {
				server.use(vhost(serverMode, app));
				console.log(`Application ${appFolder} on default route`);
			}
		} catch (e) {
			console.error(`Error loading application ${appFolder}:`, e);
		}
	}
};

loadApps().then(() => {
	server.listen(port, () => {
		console.log(`Server running on port ${port}, mode: ${serverMode}`);
	});
});
