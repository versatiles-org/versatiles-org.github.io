import { ensureDirSync, walkSync } from '@std/fs';
import { basename, resolve } from '@std/path';
import { decode as decodePng } from '@jsquash/png';
import { encode as encodeWebp } from '@jsquash/webp';
import resize from '@jsquash/resize';

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

/**
 * Minimal subset of `ImageData` that @jsquash actually consumes.
 * Deno doesn't ship the DOM `ImageData` class, but the WASM modules
 * only look at `data`, `width`, and `height` at runtime — a plain
 * object satisfies them. We cast to `ImageData` at the @jsquash
 * boundary so the rest of the file stays in plain-object land.
 */
interface RawImage {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

function asImageData(raw: RawImage): ImageData {
	return raw as unknown as ImageData;
}

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
 * Crop behavior: the input is scaled so it *covers* the target box
 * (`max(targetW/srcW, targetH/srcH)`) and then cropped — top-anchored
 * vertically, centred horizontally — so portrait or tall screenshots
 * keep their header/hero region rather than being center-cropped through
 * the middle.
 *
 * Implemented entirely in WASM via `@jsquash/*` so the build stays
 * self-contained: no system `magick`/`convert` dependency on dev machines
 * or CI runners. Each file runs through `Promise.all`.
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
	targetW: number,
	targetH: number,
	quality: number,
): Promise<void> {
	let png: Uint8Array;
	try {
		png = await Deno.readFile(src);
	} catch (error) {
		throw new Error(`Failed to read "${src}"`, { cause: error });
	}

	let decoded: RawImage;
	try {
		// `decode` accepts the underlying ArrayBuffer.
		decoded = await decodePng(png.buffer as ArrayBuffer) as unknown as RawImage;
	} catch (error) {
		throw new Error(`Failed to decode PNG "${src}"`, { cause: error });
	}

	const cropped = resizeCoverTopCrop(decoded, targetW, targetH);

	let resized: RawImage;
	try {
		// One final exact-size pass — `resizeCoverTopCrop` already produced
		// the right aspect ratio, but @jsquash/resize handles sub-pixel
		// rounding more cleanly than our hand-rolled scaling would.
		resized = await resize(asImageData(cropped), {
			width: targetW,
			height: targetH,
		}) as unknown as RawImage;
	} catch (error) {
		throw new Error(`Failed to resize "${src}"`, { cause: error });
	}

	let webp: ArrayBuffer;
	try {
		webp = await encodeWebp(asImageData(resized), { quality });
	} catch (error) {
		throw new Error(`Failed to encode WebP for "${src}"`, { cause: error });
	}

	try {
		await Deno.writeFile(dst, new Uint8Array(webp));
	} catch (error) {
		throw new Error(`Failed to write "${dst}"`, { cause: error });
	}
}

/**
 * Returns a sub-image with the same aspect ratio as `targetW:targetH`,
 * cropped top-anchored vertically and centred horizontally. The output
 * resolution is *not* yet `targetW × targetH` — a downstream resize step
 * handles the final scaling. We crop first so the resize doesn't waste
 * work on pixels we'd throw away.
 */
function resizeCoverTopCrop(src: RawImage, targetW: number, targetH: number): RawImage {
	const targetRatio = targetW / targetH;
	const srcRatio = src.width / src.height;

	let cropW: number;
	let cropH: number;
	let cropX: number;
	let cropY: number;

	if (srcRatio > targetRatio) {
		// Source is wider than target — keep full height, narrow the width
		// and centre horizontally.
		cropH = src.height;
		cropW = Math.round(src.height * targetRatio);
		cropX = Math.floor((src.width - cropW) / 2);
		cropY = 0;
	} else {
		// Source is taller (or equal) — keep full width, shrink height
		// from the bottom (top-anchored).
		cropW = src.width;
		cropH = Math.round(src.width / targetRatio);
		cropX = 0;
		cropY = 0;
	}

	if (cropW === src.width && cropH === src.height) return src;

	const out = new Uint8ClampedArray(cropW * cropH * 4);
	const dstRowBytes = cropW * 4;
	for (let row = 0; row < cropH; row++) {
		const srcOffset = ((cropY + row) * src.width + cropX) * 4;
		out.set(src.data.subarray(srcOffset, srcOffset + dstRowBytes), row * dstRowBytes);
	}
	return { data: out, width: cropW, height: cropH };
}
