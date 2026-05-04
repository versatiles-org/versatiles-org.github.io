import { ensureDirSync, walkSync } from '@std/fs';
import { basename, resolve } from '@std/path';

/**
 * Target dimensions for the rendered WebP card thumbnails.
 *
 * The cards display at ~300 CSS pixels wide; this output size gives us
 * roughly 2.5x for high-DPI displays without bloating the page weight.
 */
const TARGET_WIDTH = 800;
const TARGET_HEIGHT = 500;

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
 * Crop behavior: the input is scaled to *cover* the target aspect ratio
 * and then cropped from the top — so portrait or tall screenshots keep
 * their header/hero region rather than being center-cropped through the
 * middle.
 *
 * The conversion shells out to ImageMagick's `magick` binary, which is
 * widely available and supports WebP natively. Each file is processed in
 * parallel via `Promise.all`.
 *
 * @param srcDir - Directory containing source PNG files
 * @param dstDir - Directory where matching WebP files are written
 * @param options - Optional size/quality overrides
 * @returns The list of WebP filenames produced (basenames only)
 * @throws {Error} If `magick` is not installed or any conversion fails
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
		for (const entry of walkSync(srcDir)) {
			if (entry.isFile && /\.png$/i.test(entry.name)) sources.push(entry.path);
		}
	} catch {
		// Source directory does not exist yet — nothing to do.
		return [];
	}

	if (sources.length === 0) return [];

	ensureDirSync(dstDir);

	const written = await Promise.all(
		sources.map(async (src) => {
			const name = basename(src).replace(/\.png$/i, '.webp');
			const dst = resolve(dstDir, name);
			await convertOne(src, dst, width, height, quality);
			return name;
		}),
	);

	return written;
}

async function convertOne(
	src: string,
	dst: string,
	width: number,
	height: number,
	quality: number,
): Promise<void> {
	// `-resize WxH^` scales so the image covers the target box.
	// `-gravity north -extent WxH` crops from the top.
	// `-strip` drops EXIF/colorprofile metadata to keep files small.
	const cmd = new Deno.Command('magick', {
		args: [
			src,
			'-resize',
			`${width}x${height}^`,
			'-gravity',
			'north',
			'-extent',
			`${width}x${height}`,
			'-strip',
			'-quality',
			String(quality),
			dst,
		],
		stdout: 'null',
		stderr: 'piped',
	});

	let result;
	try {
		result = await cmd.output();
	} catch (error) {
		throw new Error(
			`Failed to invoke "magick" — make sure ImageMagick is installed (e.g. \`brew install imagemagick\`)`,
			{ cause: error },
		);
	}

	if (!result.success) {
		const stderr = new TextDecoder().decode(result.stderr).trim();
		throw new Error(`magick failed converting "${src}" → "${dst}": ${stderr}`);
	}
}
