import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { processCardImages } from './cardImages.ts';

/**
 * Builds a synthetic PNG of the given size (alternating-stripe fill so a
 * resize step has something distinguishable to work on) and writes it to `path`.
 */
async function writeSyntheticPng(path: string, width: number, height: number): Promise<void> {
	const data = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const onStripe = (x + y) % 16 < 8;
			data[i] = onStripe ? 0x44 : 0x88;
			data[i + 1] = 0x55;
			data[i + 2] = 0x66;
			data[i + 3] = 0xff;
		}
	}
	await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(path);
}

/** Reads back the pixel dimensions of an encoded image. */
async function dimensions(path: string): Promise<{ width?: number; height?: number }> {
	const { width, height } = await sharp(path).metadata();
	return { width, height };
}

describe('processCardImages', () => {
	let srcDir: string;
	let dstDir: string;

	beforeEach(() => {
		srcDir = mkdtempSync(join(tmpdir(), 'card_images_src_'));
		dstDir = mkdtempSync(join(tmpdir(), 'card_images_dst_'));
	});

	afterEach(() => {
		rmSync(srcDir, { recursive: true });
		rmSync(dstDir, { recursive: true });
	});

	it('returns empty when the source directory does not exist', async () => {
		const result = await processCardImages(join(srcDir, 'missing'), dstDir);
		expect(result).toEqual([]);
	});

	it('returns empty when the source directory has no PNGs', async () => {
		writeFileSync(join(srcDir, 'note.txt'), 'ignored');
		const result = await processCardImages(srcDir, dstDir);
		expect(result).toEqual([]);
	});

	it('converts PNGs to WebPs at the requested size', async () => {
		await writeSyntheticPng(join(srcDir, 'sample.png'), 40, 40);

		const result = await processCardImages(srcDir, dstDir, {
			width: 20,
			height: 10,
			quality: 60,
		});

		expect(result).toEqual(['sample.webp']);
		const out = join(dstDir, 'sample.webp');
		expect(existsSync(out)).toBe(true);

		expect(await dimensions(out)).toEqual({ width: 20, height: 10 });
	});

	it('top-crops sources that are taller than the target aspect ratio', async () => {
		// Source 800×800 (square); target 16:9. Should crop the bottom and
		// keep the top 800×450 region before scaling. We can't easily inspect
		// the cropped pixels post-WebP, so just verify the output has the
		// requested aspect ratio.
		await writeSyntheticPng(join(srcDir, 'tall.png'), 800, 800);

		await processCardImages(srcDir, dstDir, { width: 160, height: 90 });

		expect(await dimensions(join(dstDir, 'tall.webp'))).toEqual({ width: 160, height: 90 });
	});
});
