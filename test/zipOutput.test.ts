import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import AdmZip from "adm-zip";
import type { ResolvedConfig } from "vite";
import vitePluginZip from "../src/index.ts";

describe("zipOutput functionality", () => {
	const testDir = path.join(process.cwd(), "test-fixtures-zip");
	const distDir = path.join(testDir, "dist");

	before(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
		fs.mkdirSync(distDir, { recursive: true });
		fs.writeFileSync(path.join(distDir, "index.html"), "<html></html>");
		fs.writeFileSync(path.join(distDir, "app.js"), "console.log('test');");
		fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });
		fs.writeFileSync(path.join(distDir, "assets", "logo.svg"), "<svg></svg>");
	});

	after(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
	});

	it("should create a zip file with default name", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			silent: true,
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);

		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "dist.zip");
		assert.ok(fs.existsSync(zipPath), "Zip file should be created");

		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		assert.ok(zipEntries.length > 0, "Zip should contain files");
	});

	it("should create zip with custom name", async () => {
		const customZipName = "custom-archive.zip";
		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: customZipName,
			silent: true,
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);

		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, customZipName);
		assert.ok(fs.existsSync(zipPath), "Custom named zip should be created");
	});

	it("should include all files from dist directory", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "all-files.zip",
			silent: true,
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);

		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "all-files.zip");
		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();

		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			fileNames.includes("dist/index.html"),
			"Should include index.html",
		);
		assert.ok(fileNames.includes("dist/app.js"), "Should include app.js");
		assert.ok(
			fileNames.includes("dist/assets/logo.svg"),
			"Should include nested logo.svg",
		);
	});

	it("should exclude specified files", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			exclude: "dist/**/*.svg",
			zipName: "excluded.zip",
			silent: true,
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);

		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "excluded.zip");
		assert.ok(fs.existsSync(zipPath));

		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			!fileNames.some((name) => name.endsWith(".svg")),
			"Should not include SVG files",
		);
		assert.ok(
			fileNames.includes("dist/index.html"),
			"Should include HTML files",
		);
		assert.ok(fileNames.includes("dist/app.js"), "Should include JS files");
	});

	it("should exclude multiple patterns", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			exclude: ["dist/**/*.svg", "dist/**/*.js"],
			zipName: "multi-exclude.zip",
			silent: true,
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);

		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "multi-exclude.zip");
		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			!fileNames.some((name) => name.endsWith(".svg")),
			"Should not include SVG files",
		);
		assert.ok(
			!fileNames.some((name) => name.endsWith(".js")),
			"Should not include JS files",
		);
		assert.ok(
			fileNames.includes("dist/index.html"),
			"Should include HTML files",
		);
	});

	it("should handle string include pattern", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*.html",
			zipName: "html-only.zip",
			silent: true,
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);

		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "html-only.zip");
		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			fileNames.includes("dist/index.html"),
			"Should include HTML files",
		);
		assert.ok(
			!fileNames.some((name) => name.endsWith(".js")),
			"Should not include JS files",
		);
		assert.ok(
			!fileNames.some((name) => name.endsWith(".svg")),
			"Should not include SVG files",
		);
	});

	it("should preserve directory structure in zip", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "structure.zip",
			silent: true,
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);

		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "structure.zip");
		const zip = new AdmZip(zipPath);
		const zipEntries = zip.getEntries();
		const fileNames = zipEntries.map((entry) => entry.entryName);

		assert.ok(
			fileNames.some((name) => name.includes("dist/assets/")),
			"Should preserve nested directory structure",
		);
	});
});
