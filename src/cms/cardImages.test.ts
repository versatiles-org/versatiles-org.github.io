import { join } from '@std/path/join';
import { existsSync } from '@std/fs';
import { processCardImages } from './cardImages.ts';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';
import { encode as encodePng } from '@jsquash/png';
import { decode as decodeWebp } from '@jsquash/webp';

/**
 * Builds a synthetic PNG of the given size (alternating-stripe fill so a
 * resize step has something distinguishable to work on) and writes it to
 * `path`. Returns the encoded buffer in case the caller needs it.
 */
async function writeSyntheticPng(path: string, width: number, height: number): Promise<void> {
	const data = new Uint8ClampedArray(width * height * 4);
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
	const png = await encodePng({ data, width, height } as unknown as ImageData);
	await Deno.writeFile(path, new Uint8Array(png));
}

describe('processCardImages', () => {
	let srcDir: string;
	let dstDir: string;

	beforeEach(() => {
		srcDir = Deno.makeTempDirSync({ prefix: 'card_images_src_' });
		dstDir = Deno.makeTempDirSync({ prefix: 'card_images_dst_' });
	});

	afterEach(() => {
		Deno.removeSync(srcDir, { recursive: true });
		Deno.removeSync(dstDir, { recursive: true });
	});

	it('returns empty when the source directory does not exist', async () => {
		const result = await processCardImages(join(srcDir, 'missing'), dstDir);
		expect(result).toEqual([]);
	});

	it('returns empty when the source directory has no PNGs', async () => {
		Deno.writeTextFileSync(join(srcDir, 'note.txt'), 'ignored');
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

		const webp = await Deno.readFile(out);
		const decoded = await decodeWebp(webp.buffer as ArrayBuffer);
		expect(decoded.width).toBe(20);
		expect(decoded.height).toBe(10);
	});

	it('top-crops sources that are taller than the target aspect ratio', async () => {
		// Source 800×800 (square); target 16:9. Should crop the bottom and
		// keep the top 800×450 region before scaling. We can't easily inspect
		// the cropped pixels post-WebP, so just verify the output has the
		// requested aspect ratio.
		await writeSyntheticPng(join(srcDir, 'tall.png'), 800, 800);

		await processCardImages(srcDir, dstDir, { width: 160, height: 90 });

		const webp = await Deno.readFile(join(dstDir, 'tall.webp'));
		const decoded = await decodeWebp(webp.buffer as ArrayBuffer);
		expect(decoded.width).toBe(160);
		expect(decoded.height).toBe(90);
	});
});
