import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express from "express";
import vhost from "vhost";
import { getApps } from "./utils";

type AppConfig = {
	dbMode?: string;
	postgresUrl?: string;
	mongoUrl?: string;
};

const port = process.env.SERVER_PORT;
const serverMode = process.env.SERVER_MODE;
const appsDirPath = process.env.APPS_DIR;
const appEntryFile = process.env.APP_ENTRY_FILE;
const defaultApp = process.env.DEFAULT_APP;
const configFilePath = process.env.APPS_CONFIG_FILE;

if (!port) {
	throw new Error("SERVER_PORT env is not set");
}

if (!serverMode) {
	throw new Error("SERVER_MODE env is not set");
}

if (!appsDirPath) {
	throw new Error("APPS_DIR env is not set");
}

if (!appEntryFile) {
	throw new Error("APP_ENTRY_FILE env is not set");
}

if (!defaultApp) {
	throw new Error("DEFAULT_APP env is not set");
}

if (!configFilePath) {
	throw new Error("APPS_CONFIG_FILE env is not set");
}

const server = express();

const loadApps = async () => {
	const appsDir = resolve(appsDirPath);
	const appFolders = await getApps(appsDir);

	if (!appFolders.length) {
		console.warn(
			`No applications found to load. Check the apps directory:\n${appsDir}`
		);
		process.exit(1);
	}

	// Load configs
	const configPath = resolve(configFilePath);
	let configs: { apps: { [appId: string]: AppConfig } } = { apps: {} };
	try {
		const raw = await readFile(configPath, "utf8");
		configs = JSON.parse(raw);
	} catch (e) {
		console.error(`Failed to load config file at ${configPath}:`, e);
		process.exit(1);
	}

	for (const appFolder of appFolders) {
		try {
			const appPath = join(
				appsDir,
				`${appFolder}/${appFolder}-backend/dist`,
				appEntryFile
			);

			if (!existsSync(appPath)) {
				console.info(
					`Application entry file not found for "${appFolder}". The build may not have been completed. Skipping...`
				);
				continue;
			}

			const path = pathToFileURL(appPath).href;
			const appModule = await import(path);
			const appConfig = configs.apps?.[appFolder] ?? {};
			const app = await appModule.server(appConfig);
			const subdomain = `${appFolder}.${serverMode}`;

			// Subdomain routes
			server.use(vhost(subdomain, app));
			console.log(`Application ${appFolder} on subdomain ${subdomain}`);

			// Default route
			if (appFolder === defaultApp) {
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
