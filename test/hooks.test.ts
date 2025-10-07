import assert from "node:assert";
import type { Dirent } from "node:fs";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import AdmZip from "adm-zip";
import type { Archiver } from "archiver";
import type { ResolvedConfig } from "vite";
import vitePluginZip from "../src/index.ts";

describe("plugin hooks", () => {
	const testDir = path.join(process.cwd(), "test-fixtures-hooks");
	const distDir = path.join(testDir, "dist");

	before(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
		fs.mkdirSync(distDir, { recursive: true });
		fs.writeFileSync(path.join(distDir, "index.html"), "<html></html>");
		fs.writeFileSync(path.join(distDir, "app.js"), "console.log('test');");
		fs.writeFileSync(path.join(distDir, "styles.css"), "body { margin: 0; }");
	});

	after(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
	});

	it("should call handleFile hook for each file", async () => {
		let callCount = 0;
		const calledFiles: string[] = [];

		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "handlefile-test.zip",
			silent: true,
			handleFile: (_archive: Archiver, dirEnt: Dirent) => {
				callCount++;
				calledFiles.push(dirEnt.name);
				return false;
			},
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		assert.ok(callCount > 0, "handleFile hook should be called");
		assert.ok(calledFiles.includes("index.html"), "Should handle index.html");
		assert.ok(calledFiles.includes("app.js"), "Should handle app.js");
		assert.ok(calledFiles.includes("styles.css"), "Should handle styles.css");
	});

	it("should call beforeClose hook", async () => {
		let hookCalled = false;
		let archiveReceived = false;

		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "beforeclose-test.zip",
			silent: true,
			beforeClose: (archive: Archiver) => {
				hookCalled = true;
				archiveReceived = archive !== undefined && archive !== null;
			},
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		assert.ok(hookCalled, "beforeClose hook should be called");
		assert.ok(archiveReceived, "Archive should be passed to beforeClose");
	});

	it("should skip file when handleFile returns true", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "custom-handler.zip",
			silent: true,
			handleFile: (_archive: Archiver, dirEnt: Dirent) => {
				if (dirEnt.name === "app.js") {
					return true;
				}
				return false;
			},
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "custom-handler.zip");
		assert.ok(fs.existsSync(zipPath));

		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			!fileNames.some((name) => name.endsWith("app.js")),
			"app.js should be skipped",
		);
		assert.ok(
			fileNames.some((name) => name.endsWith("index.html")),
			"index.html should be included",
		);
		assert.ok(
			fileNames.some((name) => name.endsWith("styles.css")),
			"styles.css should be included",
		);
	});

	it("should allow custom file handling with handleFile", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "custom-naming.zip",
			silent: true,
			handleFile: (archive: Archiver, dirEnt: Dirent) => {
				const filePath = path.join(dirEnt.parentPath, dirEnt.name);
				if (dirEnt.name === "app.js") {
					archive.file(filePath, { name: "custom/renamed-app.js" });
					return true;
				}
				return false;
			},
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "custom-naming.zip");
		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			fileNames.includes("custom/renamed-app.js"),
			"Should include custom renamed file",
		);
	});

	it("should allow adding additional content in beforeClose", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "additional-content.zip",
			silent: true,
			beforeClose: (archive: Archiver) => {
				archive.append("Custom content", { name: "custom-file.txt" });
			},
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "additional-content.zip");
		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			fileNames.includes("custom-file.txt"),
			"Should include file added in beforeClose",
		);

		const customFile = zip.getEntry("custom-file.txt");
		assert.ok(customFile, "Custom file should exist");
		const content = customFile.getData().toString("utf8");
		assert.strictEqual(
			content,
			"Custom content",
			"Custom file should have correct content",
		);
	});

	it("should provide correct Dirent information to handleFile", async () => {
		const dirEntInfo: { name: string; isFile: boolean }[] = [];

		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "dirent-info.zip",
			silent: true,
			handleFile: (_archive: Archiver, dirEnt: Dirent) => {
				dirEntInfo.push({
					name: dirEnt.name,
					isFile: dirEnt.isFile(),
				});
				return false;
			},
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		assert.ok(dirEntInfo.length > 0, "Should have processed files");
		assert.ok(
			dirEntInfo.every((info) => info.isFile),
			"All processed entries should be files",
		);
	});
});
