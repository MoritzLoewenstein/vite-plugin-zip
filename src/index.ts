import fs, { type Dirent } from "node:fs";
import path from "node:path";
import archiver from "archiver";
import type { ResolvedConfig } from "vite";

export type UserOptions = {
	/**
	 * glob(array) of files to include
	 * @default dist/
	 */
	include?: string[] | string;
	/**
	 * glob(array) of files to exclude
	 * @default []
	 */
	exclude?: string[] | string;
	/**
	 * Zip Archive Name
	 * @default "dist.zip"
	 */
	zipName?: string;
	/**
	 * disable logging
	 * @default false
	 */
	silent?: boolean;
	/**
	 * custom handler for files, return true if file was handled, otherwise default handling
	 * @link https://www.npmjs.com/package/archiver
	 * @default null
	 */
	handleFile?: (archive: archiver.Archiver, dirEnt: Dirent) => boolean;
	/**
	 * add more content to archive before it is closed
	 * @link https://www.npmjs.com/package/archiver
	 * @default () => {}
	 */
	beforeClose?: (archive: archiver.Archiver) => void;
};

export type ResolvedOptions = {
	include: string[] | string;
	exclude: string[] | string;
	zipName: string;
	silent: boolean;
	handleFile: ((archive: archiver.Archiver, dirEnt: Dirent) => boolean) | null;
	beforeClose: (archive: archiver.Archiver) => void;
};

export type VitePluginZip = {
	name: string;
	apply: "build";
	enforce: "post";
	configResolved: (config: ResolvedConfig) => void;
	closeBundle: {
		sequential: true;
		handler: (error?: Error) => Promise<void>;
	};
};

export default function vitePluginZip(
	userOptions: UserOptions = {},
): VitePluginZip {
	let config: ResolvedConfig;
	const pluginOptions: ResolvedOptions = {
		include: userOptions.include ?? "dist/**/*",
		zipName: userOptions.zipName ?? "dist.zip",
		exclude: userOptions.exclude ?? [],
		silent: userOptions.silent ?? false,
		handleFile: userOptions.handleFile ?? null,
		beforeClose: userOptions.beforeClose ?? (() => {}),
	};
	return {
		name: "moritzloewenstein:vite-plugin-zip",
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

export async function zipOutput(
	pluginOptions: ResolvedOptions,
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

	if (
		pluginOptions.include === "dist/**/*" &&
		Array.isArray(pluginOptions.exclude) &&
		pluginOptions.exclude.length === 0 &&
		pluginOptions.handleFile === null
	) {
		// fastpath for dist dir without excludes and without handleFile hook
		const distDir = path.join(cwd, viteConfig.build.outDir);
		archive.directory(distDir, "dist");
		pluginOptions.beforeClose(archive);
		archive.finalize();
		return promise;
	}

	const excludeArr = Array.isArray(pluginOptions.exclude)
		? pluginOptions.exclude
		: [pluginOptions.exclude];
	const allFiles = fs.globSync(pluginOptions.include, {
		cwd,
		exclude: excludeArr,
		withFileTypes: true,
	});

	for (const dirEnt of allFiles) {
		if (!dirEnt.isFile()) {
			continue;
		}
		if (pluginOptions.handleFile !== null) {
			const handled = pluginOptions.handleFile(archive, dirEnt);
			if (handled) {
				continue;
			}
		}

		const filePath = path.join(dirEnt.parentPath, dirEnt.name);
		const relFilePath = path.relative(cwd, filePath);
		archive.file(filePath, { name: relFilePath });
	}
	pluginOptions.beforeClose(archive);
	archive.finalize();
	return promise;
}

/**
 * @param {number} size size in bytes
 * @returns {string} human readable file size
 */
export function formatFileSize(size: number): string {
	const units = ["B", "KB", "MB", "GB", "TB"];

	let index = 0;
	while (size >= 1024 && index < units.length - 1) {
		size /= 1024;
		index++;
	}

	return `${size.toFixed(2)} ${units[index]}`;
}
