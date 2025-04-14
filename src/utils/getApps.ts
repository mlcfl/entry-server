import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const getApps = async (dirPath: string) => {
	if (!existsSync(dirPath)) {
		throw new Error(`Directory "${dirPath}" not found`);
	}

	const files = await readdir(dirPath);
	const appFolders: string[] = [];

	for (const file of files) {
		const filePath = join(dirPath, file);
		const stats = await stat(filePath);

		if (stats.isDirectory()) {
			appFolders.push(file);
		}
	}

	return appFolders;
};
