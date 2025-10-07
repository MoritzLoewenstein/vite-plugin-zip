import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type { ResolvedConfig } from "vite";
import vitePluginZip from "../src/index.ts";

describe("vitePluginZip - Basic Plugin Configuration", () => {
	const testDir = path.join(process.cwd(), "test-fixtures-basic");
	const distDir = path.join(testDir, "dist");

	before(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
		fs.mkdirSync(distDir, { recursive: true });
		fs.writeFileSync(path.join(distDir, "index.html"), "<html></html>");
		fs.writeFileSync(path.join(distDir, "app.js"), "console.log('test');");
		fs.writeFileSync(path.join(distDir, "styles.css"), "body {}");
	});

	after(() => {
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true });
		}
	});

	it("should create a plugin with correct name", () => {
		const plugin = vitePluginZip({ include: "dist/**/*" });
		assert.strictEqual(plugin.name, "moritzloewenstein:vite-plugin-zip");
	});

	it("should apply only on build", () => {
		const plugin = vitePluginZip({ include: "dist/**/*" });
		assert.strictEqual(plugin.apply, "build");
	});

	it("should have post enforcement", () => {
		const plugin = vitePluginZip({ include: "dist/**/*" });
		assert.strictEqual(plugin.enforce, "post");
	});

	it("should have closeBundle hook that is sequential", () => {
		const plugin = vitePluginZip({ include: "dist/**/*" });
		assert.ok(plugin.closeBundle);
		assert.strictEqual(typeof plugin.closeBundle, "object");
		assert.strictEqual(plugin.closeBundle.sequential, true);
		assert.strictEqual(typeof plugin.closeBundle.handler, "function");
	});

	it("should use default zipName when not provided", async () => {
		const plugin = vitePluginZip({ include: "dist/**/*", silent: true });
		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "dist.zip");
		assert.ok(fs.existsSync(zipPath), "Default zip file should be created");
	});

	it("should accept custom zipName", async () => {
		const plugin = vitePluginZip({
			include: "dist/**/*",
			zipName: "custom.zip",
			silent: true,
		});

		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);
		await plugin.closeBundle.handler();

		const zipPath = path.join(distDir, "custom.zip");
		assert.ok(fs.existsSync(zipPath), "Custom zip file should be created");
	});

	it("should not execute on error", async () => {
		const plugin = vitePluginZip({ include: "dist/**/*", silent: true });
		const mockConfig: ResolvedConfig = {
			root: testDir,
			build: { outDir: "dist" },
		} as ResolvedConfig;

		plugin.configResolved(mockConfig);

		if (fs.existsSync(path.join(distDir, "error-test.zip"))) {
			fs.unlinkSync(path.join(distDir, "error-test.zip"));
		}

		await plugin.closeBundle.handler(new Error("Test error"));

		const zipPath = path.join(distDir, "error-test.zip");
		assert.ok(!fs.existsSync(zipPath), "Zip should not be created on error");
	});
});
