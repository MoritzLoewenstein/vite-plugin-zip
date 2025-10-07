import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import AdmZip from "adm-zip";
import type { ResolvedConfig } from "vite";
import vitePluginZip from "../dist/index.js";

describe("default options", () => {
	const testDir = path.join(process.cwd(), "test-fixtures-defaults");
	const distDir = path.join(testDir, "dist");

	before(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
		fs.mkdirSync(distDir, { recursive: true });
		fs.writeFileSync(path.join(distDir, "index.html"), "<html></html>");
		fs.writeFileSync(path.join(distDir, "app.js"), "console.log('test');");
	});

	after(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
	});

	it("should work with no options provided", async () => {
		const plugin = vitePluginZip();

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "dist.zip");
		assert.ok(fs.existsSync(zipPath), "Default zip should be created");

		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			fileNames.some((name) => name.includes("index.html")),
			"Should include files from dist",
		);
	});

	it("should use default include pattern of dist", async () => {
		const plugin = vitePluginZip({ zipName: "default-include.zip" });

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "default-include.zip");
		assert.ok(fs.existsSync(zipPath));

		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();

		assert.ok(
			zipEntries.length > 0,
			"Should include files with default pattern",
		);
	});
});
