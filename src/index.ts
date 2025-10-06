import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import type { Plugin, ResolvedConfig } from "vite";

export type Options = {
	/**
	 * glob(array) of files to include
	 * @default `dist/`
	 */
	include: string[] | string;
	/**
	 * glob(array) of files to exclude
	 * @default []
	 */
	exclude: string[] | string;
	/**
	 * Zip Archive Name
	 * @example: 'project.zip'
	 */
	zipName: string;
	/**
	 * disable logging
	 * @default false
	 */
	silent: boolean;
};

export function vitePluginZip(pluginOptions: Options): Plugin {
	let config: ResolvedConfig;
	return {
		name: "vite-plugin-zip",
		apply: "build",
		enforce: "post",
		configResolved(_config: ResolvedConfig): void {
			config = _config;
		},
		closeBundle: {
			sequential: true,
			async handler(error?: Error): Promise<void> {
				if (error) {
					return;
				}
				await zipOutput(pluginOptions, config);
			},
		},
	};
}

async function zipOutput(
	pluginOptions: Options,
	viteConfig: ResolvedConfig,
): Promise<unknown> {
	const { promise, resolve, reject } = Promise.withResolvers();
	const cwd = viteConfig.root;
	const distDir = path.join(cwd, viteConfig.build.outDir);
	const ZIP_OUT_FILE = path.join(distDir, pluginOptions.zipName);
	const output = fs.createWriteStream(ZIP_OUT_FILE);
	const archive = archiver("zip", {
		zlib: { level: -1 },
	});
	output.on("close", () => {
		if (!pluginOptions.silent) {
			console.log(
				`${pluginOptions.zipName} size: ${formatFileSize(archive.pointer())}`,
			);
		}
		resolve(undefined);
	});
	archive.on("warning", (err) => {
		if (err.code === "ENOENT") {
			console.log(err);
		} else {
			reject(err);
		}
	});
	archive.on("error", (err) => {
		reject(err);
	});
	archive.pipe(output);

	const excludeArr = Array.isArray(pluginOptions.exclude)
		? pluginOptions.exclude
		: [pluginOptions.exclude];
	const allFiles = fs.globSync(pluginOptions.include, {
		cwd,
		exclude: excludeArr,
	});
	//TODO does this include dirs? if it includes dirs, does it also include all files inside them?
	for (const filePath of allFiles) {
		const relFilePath = path.relative(cwd, filePath);
		archive.file(filePath, { name: relFilePath });
	}
	return promise;
}

/**
 * @param {number} size size in bytes
 * @returns {string} human readable file size
 */
function formatFileSize(size: number): string {
	const units = ["B", "KB", "MB", "GB", "TB"];

	let index = 0;
	while (size >= 1024 && index < units.length - 1) {
		size /= 1024;
		index++;
	}

	return `${size.toFixed(2)} ${units[index]}`;
}
