import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd } from "node:process";
import { parse as dotenvParse } from "dotenv";

/**
 * Generates configuration JSON files for development and production
 * environments based on the .env files found in each application's
 * backend directory.
 * Contains database connection settings per app.
 */

type AppConfig = {
	dbMode?: string;
	postgresUrl?: string;
	mongoUrl?: string;
};

const appsDirEnv = process.env.APPS_DIR;

if (!appsDirEnv) {
	throw new Error("APPS_DIR env is not set");
}

const appsRoot = resolve(appsDirEnv);
const appsDev: Record<string, AppConfig> = {};
const appsProd: Record<string, AppConfig> = {};

try {
	const entries = await readdir(appsRoot, { withFileTypes: true });

	for (const ent of entries) {
		if (!ent.isDirectory()) {
			continue;
		}

		const appId = ent.name;
		const backendRoot = join(appsRoot, appId, `${appId}-backend`);

		try {
			await access(backendRoot);
		} catch {
			continue;
		}

		const devPath = join(backendRoot, ".env.development");
		const prodPath = join(backendRoot, ".env.production");

		let dev: Record<string, string> = {};
		let prod: Record<string, string> = {};

		try {
			await access(devPath);
			const content = await readFile(devPath, "utf8");
			dev = dotenvParse(content);
		} catch {
			// Missing or unreadable dev file — leave as {}
		}

		try {
			await access(prodPath);
			const content = await readFile(prodPath, "utf8");
			prod = dotenvParse(content);
		} catch {
			// Missing or unreadable prod file — leave as {}
		}

		appsDev[appId] = {
			dbMode: dev.DATABASE_MODE,
			postgresUrl: dev.PG_DATABASE_URL,
			mongoUrl: dev.MONGO_DATABASE_URL,
		};

		appsProd[appId] = {
			dbMode: prod.DATABASE_MODE,
			postgresUrl: prod.PG_DATABASE_URL,
			mongoUrl: prod.MONGO_DATABASE_URL,
		};
	}

	const outDev = {
		comment: "This file is auto-generated. Do not edit directly.",
		apps: appsDev,
	};
	const outProd = {
		comment: "This file is auto-generated. Do not edit directly.",
		apps: appsProd,
	};

	const outDevPath = resolve(cwd(), "config.development.json");
	const outProdPath = resolve(cwd(), "config.production.json");

	await writeFile(outDevPath, JSON.stringify(outDev, null, 2), "utf8");
	await writeFile(outProdPath, JSON.stringify(outProd, null, 2), "utf8");

	console.log(`Wrote config files to ${outDevPath} and ${outProdPath}`);
} catch (e) {
	console.error("Error while generating configs:", e);
}
