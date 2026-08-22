import { mkdirSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import sharp from 'sharp';
import { walkFiles } from './walk.ts';

/**
 * Target dimensions for the rendered WebP card thumbnails.
 *
 * The cards display at ~300 CSS pixels wide; this output size gives us
 * roughly 2.5x for high-DPI displays without bloating the page weight.
 * 16:9 is the natural aspect ratio for screenshots and the CSS expects it.
 */
const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 450;

/** WebP quality (0-100). 78 is a good size/quality tradeoff for screenshots. */
const WEBP_QUALITY = 78;

interface ProcessOptions {
	/** Override target width (mostly for tests). */
	width?: number;
	/** Override target height (mostly for tests). */
	height?: number;
	/** Override WebP quality (mostly for tests). */
	quality?: number;
}

/**
 * Resizes, top-crops, and encodes every PNG in `srcDir` as WebP into `dstDir`.
 *
 * Crop behavior: the input is scaled so it *covers* the target box and is then
 * cropped — top-anchored vertically, centred horizontally — so portrait or tall
 * screenshots keep their header/hero region rather than being cropped through
 * the middle. That is precisely sharp's `fit: 'cover'` with `position: 'top'`,
 * which is why this no longer carries its own crop arithmetic.
 *
 * sharp resolves a prebuilt libvips binary for macOS and Linux from the
 * lockfile, so the build stays self-contained: no system `magick`/`convert`
 * on dev machines or CI runners. Each file runs through `Promise.all`.
 *
 * @param srcDir - Directory containing source PNG files
 * @param dstDir - Directory where matching WebP files are written
 * @param options - Optional size/quality overrides
 * @returns The list of WebP filenames produced (basenames only)
 */
export async function processCardImages(
	srcDir: string,
	dstDir: string,
	options: ProcessOptions = {},
): Promise<string[]> {
	const width = options.width ?? TARGET_WIDTH;
	const height = options.height ?? TARGET_HEIGHT;
	const quality = options.quality ?? WEBP_QUALITY;

	const sources: string[] = [];
	try {
		for (const entry of walkFiles(srcDir)) {
			if (/\.png$/i.test(entry.name)) sources.push(entry.path);
		}
	} catch {
		// Source directory does not exist yet — nothing to do.
		return [];
	}

	if (sources.length === 0) return [];

	mkdirSync(dstDir, { recursive: true });

	const written = await Promise.all(
		sources.map(async (src) => {
			const name = basename(src).replace(/\.png$/i, '.webp');
			const dst = resolve(dstDir, name);
			try {
				await sharp(src)
					.resize(width, height, { fit: 'cover', position: 'top' })
					.webp({ quality })
					.toFile(dst);
			} catch (error) {
				throw new Error(`Failed to convert "${src}" to "${dst}"`, { cause: error });
			}
			return name;
		}),
	);

	return written;
}
