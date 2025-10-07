import assert from "node:assert";
import { describe, it } from "node:test";
import { formatFileSize } from "../dist/index.js";

describe("formatFileSize", () => {
	it("should format bytes correctly", () => {
		assert.strictEqual(formatFileSize(0), "0.00 B");
		assert.strictEqual(formatFileSize(100), "100.00 B");
		assert.strictEqual(formatFileSize(500), "500.00 B");
		assert.strictEqual(formatFileSize(1023), "1023.00 B");
	});

	it("should format kilobytes correctly", () => {
		assert.strictEqual(formatFileSize(1024), "1.00 KB");
		assert.strictEqual(formatFileSize(1024 * 10), "10.00 KB");
		assert.strictEqual(formatFileSize(1024 * 100), "100.00 KB");
		assert.strictEqual(formatFileSize(1024 * 512), "512.00 KB");
	});

	it("should format megabytes correctly", () => {
		assert.strictEqual(formatFileSize(1024 * 1024), "1.00 MB");
		assert.strictEqual(formatFileSize(1024 * 1024 * 5), "5.00 MB");
		assert.strictEqual(formatFileSize(1024 * 1024 * 100), "100.00 MB");
		assert.strictEqual(formatFileSize(1024 * 1024 * 999), "999.00 MB");
	});

	it("should format gigabytes correctly", () => {
		assert.strictEqual(formatFileSize(1024 * 1024 * 1024), "1.00 GB");
		assert.strictEqual(formatFileSize(1024 * 1024 * 1024 * 2), "2.00 GB");
		assert.strictEqual(formatFileSize(1024 * 1024 * 1024 * 50), "50.00 GB");
	});

	it("should format terabytes correctly", () => {
		assert.strictEqual(formatFileSize(1024 * 1024 * 1024 * 1024), "1.00 TB");
		assert.strictEqual(
			formatFileSize(1024 * 1024 * 1024 * 1024 * 5),
			"5.00 TB",
		);
	});

	it("should handle edge case of 0 bytes", () => {
		assert.strictEqual(formatFileSize(0), "0.00 B");
	});

	it("should handle fractional values correctly", () => {
		assert.strictEqual(formatFileSize(1536), "1.50 KB");
		assert.strictEqual(formatFileSize(1024 * 1024 * 1.5), "1.50 MB");
		assert.strictEqual(formatFileSize(1024 * 1024 * 1024 * 2.75), "2.75 GB");
	});

	it("should round to 2 decimal places", () => {
		const result = formatFileSize(1234567);
		assert.ok(result.includes("."), "Should include decimal point");
		const parts = result.split(".");
		assert.ok(parts[1], "Should have decimal part");
		const decimalPart = parts[1].split(" ")[0];
		assert.ok(decimalPart, "Should have decimal digits");
		assert.strictEqual(decimalPart.length, 2, "Should have 2 decimal places");
	});

	it("should not exceed TB unit", () => {
		const hugeSize = 1024 * 1024 * 1024 * 1024 * 9999;
		const result = formatFileSize(hugeSize);
		assert.ok(result.endsWith("TB"), "Should use TB for very large sizes");
	});
});
