import { join } from '@std/path/join';
import { existsSync } from '@std/fs';
import { processCardImages } from './cardImages.ts';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';

/**
 * These tests shell out to ImageMagick (`magick`). If the binary is not
 * available — for example in a minimal CI image — the binary-dependent
 * cases are skipped so the rest of the suite still passes.
 */
const magickAvailable = await (async () => {
	try {
		const out = await new Deno.Command('magick', {
			args: ['-version'],
			stdout: 'null',
			stderr: 'null',
		}).output();
		return out.success;
	} catch {
		return false;
	}
})();

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
		if (!magickAvailable) return;
		// Generate a tiny test PNG without committing fixture files.
		await new Deno.Command('magick', {
			args: ['-size', '40x40', 'xc:#445566', join(srcDir, 'sample.png')],
			stdout: 'null',
			stderr: 'null',
		}).output();

		const result = await processCardImages(srcDir, dstDir, {
			width: 20,
			height: 10,
			quality: 60,
		});

		expect(result).toEqual(['sample.webp']);
		const out = join(dstDir, 'sample.webp');
		expect(existsSync(out)).toBe(true);

		// Verify the output is a valid WebP at the requested size.
		const id = await new Deno.Command('magick', {
			args: ['identify', '-format', '%w %h %m', out],
			stdout: 'piped',
			stderr: 'null',
		}).output();
		const text = new TextDecoder().decode(id.stdout).trim();
		expect(text).toBe('20 10 WEBP');
	});
});
