/**
 * Renders the built site's menu in every browser engine Playwright supports, then
 * checks each engine against the design and compares the engines with each other.
 *
 * Nothing is stored as a baseline: the screenshots are compared within one run, so
 * the checks do not depend on the fonts of the machine that first ran them.
 *
 * Run with `npm run test:browsers`, which builds the site first.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve } from 'node:path';
import {
	type Browser,
	type BrowserContextOptions,
	type BrowserType,
	chromium,
	devices,
	firefox,
	type Page,
	webkit,
} from 'playwright';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const DIST = resolve(import.meta.dirname, '../../dist');
const ENGINES: Record<string, BrowserType> = { chromium, firefox, webkit };
const ENGINE_NAMES = Object.keys(ENGINES);

const COMPACT_WIDTHS = [320, 360, 430, 640];
const WIDE_WIDTHS = [641, 1024, 1440];

/** Largest allowed difference between engines, in CSS pixels. */
const BOX_TOLERANCE = 1;
/** Text is measured with each engine's own font rendering, and offsets add up along a row. */
const TEXT_TOLERANCE = 4;
/** Largest share of pixels that may differ between engines' screenshots. */
const SCREENSHOT_TOLERANCE = 0.02;

const MIME_TYPES: Record<string, string> = {
	'.css': 'text/css',
	'.html': 'text/html',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
};

let server: Server;
let origin: string;
const browsers = new Map<string, Browser>();

function browserFor(engine: string): Browser {
	const browser = browsers.get(engine);
	if (!browser) throw new Error(`Browser ${engine} is not running`);
	return browser;
}

beforeAll(async () => {
	if (!existsSync(join(DIST, 'playground.html'))) {
		throw new Error('dist/ is missing: run `npm run test:browsers`, which builds the site first');
	}
	server = createServer(async (request, response) => {
		const path = new URL(request.url ?? '/', 'http://localhost').pathname;
		try {
			const body = await readFile(join(DIST, path));
			response.writeHead(200, { 'content-type': MIME_TYPES[extname(path)] ?? 'text/plain' });
			response.end(body);
		} catch {
			response.writeHead(404);
			response.end();
		}
	});
	await new Promise<void>((done) => {
		server.listen(0, done);
	});
	origin = `http://localhost:${(server.address() as AddressInfo).port}`;

	await Promise.all(
		Object.entries(ENGINES).map(async ([name, type]) => {
			browsers.set(name, await type.launch());
		}),
	);
}, 60_000);

afterAll(async () => {
	await Promise.all([...browsers.values()].map((browser) => browser.close()));
	server?.close();
});

interface OpenOptions extends BrowserContextOptions {
	path?: string;
	/**
	 * Gives every engine the same font. The site asks for `sans-serif`, which on Linux
	 * resolves to different fonts per engine, and comparing those says nothing about the CSS.
	 */
	pinFont?: boolean;
}

/** Opens a page of the built site with outside requests blocked, then runs `use` on it. */
async function withPage<T>(
	engine: string,
	{ path = '/playground.html', pinFont = false, ...options }: OpenOptions,
	use: (page: Page) => Promise<T>,
): Promise<T> {
	const context = await browserFor(engine).newContext({
		reducedMotion: 'reduce',
		viewport: { width: 360, height: 640 },
		...options,
	});
	try {
		const page = await context.newPage();
		await page.route(
			(url) => !url.href.startsWith(origin),
			(route) => route.abort(),
		);
		await page.goto(origin + path, { waitUntil: 'load' });
		if (pinFont) {
			await page.addStyleTag({ content: 'body { font-family: Arial, "Liberation Sans"; }' });
		}
		await page.evaluate(() => document.fonts.ready.then(() => undefined));
		return await use(page);
	} finally {
		await context.close();
	}
}

const isMenuOpen = (page: Page): Promise<boolean> =>
	page.locator('#site-menu').evaluate((menu) => menu.matches(':popover-open'));

/** Named boxes of the menu, as flat numbers, ready to compare between engines. */
function measureMenu(page: Page): Promise<Record<string, number>> {
	return page.evaluate(() => {
		const result: Record<string, number> = {};
		const add = (name: string, element: Element | null) => {
			if (!element) return;
			const box = element.getBoundingClientRect();
			result[`${name}.left`] = box.left;
			result[`${name}.top`] = box.top;
			result[`${name}.width`] = box.width;
			result[`${name}.height`] = box.height;
		};
		add('nav', document.querySelector('nav'));
		add('logo', document.querySelector('nav .logo img'));
		add('toggle', document.querySelector('.menu-toggle'));
		add('icon', document.querySelector('.menu-toggle svg'));
		add('menu', document.querySelector('#site-menu'));
		document.querySelectorAll('#site-menu a').forEach((link, index) => {
			add(`link${index}`, link);
		});
		return result;
	});
}

/** Fails naming every box on which the engines disagree by more than the tolerance. */
function expectSameMeasurements(measurements: Record<string, Record<string, number>>) {
	const [first] = Object.values(measurements);
	const disagreements = Object.keys(first ?? {}).flatMap((key) => {
		const values = Object.values(measurements).map((boxes) => boxes[key] ?? Number.NaN);
		// Box sizes that follow from the text, and positions in the row of links.
		const textDriven = /^(toggle|icon|link\d+)\.(left|width)$|^menu\.(left|width)$/.test(key);
		const tolerance = textDriven ? TEXT_TOLERANCE : BOX_TOLERANCE;
		return Math.max(...values) - Math.min(...values) <= tolerance
			? []
			: [`${key}: ${ENGINE_NAMES.map((name, i) => `${name}=${values[i]}`).join(', ')}`];
	});
	expect(disagreements).toEqual([]);
}

async function toPixels(png: Buffer, blur?: number) {
	const image = sharp(png).removeAlpha();
	if (blur) image.blur(blur);
	const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
	const at = (x: number, y: number): [number, number, number] => {
		const offset = (y * info.width + x) * 3;
		return [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0];
	};
	return { data, width: info.width, height: info.height, at };
}

/**
 * The share of pixels that clearly differ. Engines smooth the edges of text differently,
 * so a light blur first keeps that out of the result while real shifts still show.
 */
async function differingShare(a: Buffer, b: Buffer): Promise<number> {
	const [one, two] = await Promise.all([toPixels(a, 2), toPixels(b, 2)]);
	expect([one.width, one.height]).toEqual([two.width, two.height]);
	let differing = 0;
	for (let y = 0; y < one.height; y++) {
		for (let x = 0; x < one.width; x++) {
			const [r1, g1, b1] = one.at(x, y);
			const [r2, g2, b2] = two.at(x, y);
			if (Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2) > 96) differing++;
		}
	}
	return differing / (one.width * one.height);
}

/** Runs one screenshot in every engine and compares them all with the first. */
async function expectSameScreenshots(shoot: (engine: string) => Promise<Buffer>) {
	const shots = await Promise.all(ENGINE_NAMES.map(shoot));
	const [reference, ...others] = shots;
	if (!reference) throw new Error('no screenshots');
	for (const other of others) {
		expect(await differingShare(reference, other)).toBeLessThanOrEqual(SCREENSHOT_TOLERANCE);
	}
}

describe.each(ENGINE_NAMES)('%s', (engine) => {
	describe.each(COMPACT_WIDTHS)('at %ipx wide', (width) => {
		const options = { viewport: { width, height: 640 } };

		it('shows only the logo and the button while closed', async () => {
			await withPage(engine, options, async (page) => {
				expect(await page.locator('.menu-toggle').isVisible()).toBe(true);
				expect(await page.locator('#site-menu').isVisible()).toBe(false);
				const box = await page.locator('.menu-toggle').boundingBox();
				expect(box?.height).toBeGreaterThanOrEqual(44);
				expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
			});
		});

		it('opens a sheet of three tiles across, two down and a GitHub row', async () => {
			await withPage(engine, options, async (page) => {
				await page.click('.menu-toggle');
				const tiles = await page.locator('#site-menu a').evaluateAll((links) =>
					links.map((link) => {
						const box = link.getBoundingClientRect();
						const range = document.createRange();
						range.selectNodeContents(link);
						const text = range.getBoundingClientRect();
						return {
							left: box.left,
							top: box.top,
							width: box.width,
							height: box.height,
							fits: link.scrollWidth <= link.clientWidth,
							centre: text.width > 0 ? text.left + text.width / 2 - box.left - box.width / 2 : 0,
						};
					}),
				);
				expect(tiles).toHaveLength(7);

				const third = (width - 2) / 3;
				for (const tile of tiles.slice(0, 6)) {
					expect(tile.width).toBeCloseTo(third, 0);
					expect(tile.height).toBe(56);
					expect(tile.fits).toBe(true);
					expect(Math.abs(tile.centre)).toBeLessThanOrEqual(1);
				}
				expect(new Set(tiles.slice(0, 3).map((tile) => tile.top)).size).toBe(1);
				expect(new Set(tiles.slice(3, 6).map((tile) => tile.top)).size).toBe(1);
				expect(tiles[6]?.width).toBeCloseTo(width, 0);
				expect(tiles[6]?.height).toBe(48);

				const sheet = await page.locator('#site-menu').boundingBox();
				expect(sheet?.y).toBe(64);
				expect(sheet?.width).toBeCloseTo(width, 0);
				expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
			});
		});

		it('paints the current page white and the seams in the brand gradient', async () => {
			await withPage(engine, options, async (page) => {
				await page.click('.menu-toggle');
				const current = page.locator('#site-menu li.selected');
				expect(await current.locator('a').getAttribute('aria-current')).toBe('page');

				const sheet = await page.locator('#site-menu').boundingBox();
				const png = await page.screenshot({
					clip: { x: 0, y: 64, width, height: sheet?.height ?? 0 },
				});
				const pixels = await toPixels(png);
				const third = Math.floor((width - 2) / 3);

				// The third tile of the first row is Playground, the page under test.
				expect(pixels.at(2 * third + 8, 4)).toEqual([255, 255, 255]);
				expect(pixels.at(8, 4)).toEqual([27, 27, 31]);

				// The seam under the first row, sampled where the gradient is purple.
				const [red, green, blue] = pixels.at(Math.floor(third / 2), 56);
				expect(blue).toBeGreaterThan(green + 50);
				expect(red).toBeGreaterThan(green);
			});
		});
	});

	describe.each(WIDE_WIDTHS)('at %ipx wide', (width) => {
		const options = { viewport: { width, height: 640 } };

		it('shows every link in one row and no button', async () => {
			await withPage(engine, options, async (page) => {
				expect(await page.locator('.menu-toggle').isVisible()).toBe(false);
				expect(await page.locator('#site-menu').isVisible()).toBe(true);

				const links = await page.locator('#site-menu a').evaluateAll((elements) =>
					elements.map((element) => {
						const box = element.getBoundingClientRect();
						return { top: box.top, height: box.height };
					}),
				);
				expect(links).toHaveLength(7);
				for (const link of links) expect(link).toEqual({ top: 0, height: 63 });

				const nav = page.locator('nav');
				expect(await nav.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
					true,
				);
				expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
			});
		});

		it('thickens the header line under the current page', async () => {
			await withPage(engine, options, async (page) => {
				const box = await page.locator('#site-menu li.selected a').boundingBox();
				if (!box) throw new Error('no current page in the menu');
				const png = await page.screenshot({ clip: { x: 0, y: 58, width, height: 8 } });
				const pixels = await toPixels(png);
				const middle = Math.round(box.x + box.width / 2);

				// y 61-63 of the page, inside the clip that starts at y 58.
				for (const y of [3, 4, 5]) expect(pixels.at(middle, y)).toEqual([255, 255, 255]);
				expect(pixels.at(middle, 2)).toEqual([27, 27, 31]);
			});
		});
	});

	describe('the menu button', () => {
		it('centres its icon and text, horizontally and vertically', async () => {
			const scale = 4;
			await withPage(engine, { deviceScaleFactor: scale }, async (page) => {
				const pixels = await toPixels(await page.locator('.menu-toggle').screenshot());
				// Skips the rounded border, and finds everything bright inside it.
				const inset = 2 * scale + 2;
				const isInk = (x: number, y: number) => pixels.at(x, y)[0] > 120;

				const columns: number[] = [];
				for (let x = inset; x < pixels.width - inset; x++) {
					for (let y = inset; y < pixels.height - inset; y++) {
						if (isInk(x, y)) {
							columns.push(x);
							break;
						}
					}
				}
				const first = columns[0] ?? 0;
				const last = columns.at(-1) ?? 0;

				// The widest empty stretch separates the icon from the text.
				let split = first;
				let widest = 0;
				columns.forEach((column, i) => {
					const gap = column - (columns[i - 1] ?? column);
					if (gap > widest) {
						widest = gap;
						split = column;
					}
				});

				const middleOfInk = (from: number, to: number) => {
					let top = pixels.height;
					let bottom = 0;
					for (let x = from; x <= to; x++) {
						for (let y = inset; y < pixels.height - inset; y++) {
							if (isInk(x, y)) {
								top = Math.min(top, y);
								bottom = Math.max(bottom, y);
							}
						}
					}
					return (top + bottom + 1) / 2 / scale;
				};
				const icon = middleOfInk(first, split - 1);
				const text = middleOfInk(split, last);
				const button = pixels.height / 2 / scale;

				expect(Math.abs(icon - text)).toBeLessThanOrEqual(1);
				expect(Math.abs(icon - button)).toBeLessThanOrEqual(1);
				expect(Math.abs(text - button)).toBeLessThanOrEqual(1);

				const leftSpace = first / scale;
				const rightSpace = (pixels.width - 1 - last) / scale;
				expect(Math.abs(leftSpace - rightSpace)).toBeLessThanOrEqual(1.5);
			});
		});

		it('stays one size however wide the screen is', async () => {
			const sizes = await Promise.all(
				COMPACT_WIDTHS.map((width) =>
					withPage(engine, { viewport: { width, height: 640 } }, (page) =>
						page.locator('.menu-toggle').evaluate((button) => {
							const box = button.getBoundingClientRect();
							return `${box.width}x${box.height}`;
						}),
					),
				),
			);
			expect(new Set(sizes).size).toBe(1);
		});
	});

	describe('opening and closing', () => {
		it('closes with Escape, the button, and a tap outside', async () => {
			await withPage(engine, {}, async (page) => {
				await page.click('.menu-toggle');
				expect(await isMenuOpen(page)).toBe(true);
				await page.keyboard.press('Escape');
				expect(await isMenuOpen(page)).toBe(false);

				await page.click('.menu-toggle');
				await page.click('.menu-toggle');
				expect(await isMenuOpen(page)).toBe(false);

				await page.click('.menu-toggle');
				await page.mouse.click(180, 600);
				expect(await isMenuOpen(page)).toBe(false);
			});
		});

		it('does not follow a link under a tap that closes the menu', async () => {
			await withPage(engine, { path: '/index.html' }, async (page) => {
				const before = page.url();
				await page.evaluate(() => {
					const link = document.createElement('a');
					link.href = '/elsewhere';
					link.style.cssText = 'position:fixed;inset:300px 0 0;z-index:1';
					document.querySelector('main')?.append(link);
				});
				await page.click('.menu-toggle');
				await page.mouse.click(180, 500);
				expect(await isMenuOpen(page)).toBe(false);
				expect(page.url()).toBe(before);
			});
		});

		it('finishes the opening animation within 200ms', async () => {
			await withPage(engine, { reducedMotion: 'no-preference' }, async (page) => {
				await page.click('.menu-toggle');
				const end = await page.locator('#site-menu li').evaluateAll((items) =>
					Math.max(
						...items.flatMap((item) =>
							item.getAnimations().map((animation) => {
								return Number(animation.effect?.getComputedTiming().endTime ?? 0);
							}),
						),
						0,
					),
				);
				expect(end).toBeLessThanOrEqual(200);
			});
		});

		it('skips the animation for people who ask for reduced motion', async () => {
			await withPage(engine, { reducedMotion: 'reduce' }, async (page) => {
				await page.click('.menu-toggle');
				const count = await page
					.locator('#site-menu li')
					.evaluateAll((items) => items.flatMap((item) => item.getAnimations()).length);
				expect(count).toBe(0);
			});
		});

		it('scrolls away with the header', async () => {
			await withPage(engine, { path: '/index.html' }, async (page) => {
				await page.click('.menu-toggle');
				await page.evaluate(() => window.scrollTo(0, 50));
				const box = await page.locator('#site-menu').boundingBox();
				expect(box?.y).toBe(14);
			});
		});

		it('turns back into the row of links if the screen gets wider while open', async () => {
			await withPage(engine, {}, async (page) => {
				await page.click('.menu-toggle');
				await page.setViewportSize({ width: 1000, height: 640 });
				const box = await page.locator('#site-menu').boundingBox();
				expect(box?.y).toBe(0);
				expect(box?.height).toBe(63);
				expect((box?.x ?? 0) + (box?.width ?? 0)).toBeCloseTo(980, 0);
			});
		});
	});

	it('still fits pages whose HTML has no button yet', async () => {
		// The sister sites load this stylesheet but rebuild their HTML separately.
		await withPage(engine, {}, async (page) => {
			await page.evaluate(() => {
				document.querySelector('.menu-toggle')?.remove();
				const menu = document.querySelector('#site-menu');
				menu?.removeAttribute('popover');
				menu?.removeAttribute('id');
			});
			const list = page.locator('nav ul');
			expect(await list.isVisible()).toBe(true);
			const box = await list.boundingBox();
			expect(box?.height).toBeLessThanOrEqual(63);
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
		});
	});

	it('hides the menu when printing', async () => {
		await withPage(engine, { viewport: { width: 1024, height: 640 } }, async (page) => {
			await page.emulateMedia({ media: 'print' });
			expect(await page.locator('nav').isVisible()).toBe(false);
		});
	});
});

describe('emulated phones', () => {
	const phones: [string, string, BrowserContextOptions][] = [
		['Pixel 7', 'chromium', devices['Pixel 7'] ?? {}],
		['iPhone 15', 'webkit', devices['iPhone 15'] ?? {}],
	];

	it.each(phones)('%s does not follow a link under a tap that closes the menu', async (_, engine, device) => {
		await withPage(engine, { ...device, path: '/index.html' }, async (page) => {
			const before = page.url();
			await page.evaluate(() => {
				const link = document.createElement('a');
				link.href = '/elsewhere';
				link.style.cssText = 'position:fixed;inset:300px 0 0;z-index:1';
				document.querySelector('main')?.append(link);
			});
			await page.tap('.menu-toggle');
			await page.touchscreen.tap(180, 500);
			await page.waitForTimeout(200);
			expect(await isMenuOpen(page)).toBe(false);
			expect(page.url()).toBe(before);
		});
	});

	it.each(phones)('%s opens the menu with a tap and follows a tile', async (_, engine, device) => {
		await withPage(engine, device, async (page) => {
			await page.tap('.menu-toggle');
			expect(await isMenuOpen(page)).toBe(true);

			const tile = await page.locator('#site-menu li:nth-child(4) a').boundingBox();
			expect(tile?.height).toBeGreaterThanOrEqual(44);
			expect(tile?.width).toBeGreaterThanOrEqual(44);
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
				await page.evaluate(() => window.innerWidth),
			);

			const href = await page.locator('#site-menu li:nth-child(4) a').getAttribute('href');
			expect(href).toBe('https://versatiles.org/tools/');
		});
	});
});

describe('all engines agree', () => {
	it.each(COMPACT_WIDTHS)('on the measurements of the closed menu at %ipx', async (width) => {
		const results: Record<string, Record<string, number>> = {};
		await Promise.all(
			ENGINE_NAMES.map(async (engine) => {
				results[engine] = await withPage(engine, { pinFont: true, viewport: { width, height: 640 } }, measureMenu);
			}),
		);
		expectSameMeasurements(results);
	});

	it.each(COMPACT_WIDTHS)('on the measurements of the open menu at %ipx', async (width) => {
		const results: Record<string, Record<string, number>> = {};
		await Promise.all(
			ENGINE_NAMES.map(async (engine) => {
				results[engine] = await withPage(
					engine,
					{ pinFont: true, viewport: { width, height: 640 } },
					async (page) => {
						await page.click('.menu-toggle');
						return measureMenu(page);
					},
				);
			}),
		);
		expectSameMeasurements(results);
	});

	it.each(WIDE_WIDTHS)('on the measurements of the row of links at %ipx', async (width) => {
		const results: Record<string, Record<string, number>> = {};
		await Promise.all(
			ENGINE_NAMES.map(async (engine) => {
				results[engine] = await withPage(engine, { pinFont: true, viewport: { width, height: 640 } }, measureMenu);
			}),
		);
		expectSameMeasurements(results);
	});

	it.each(COMPACT_WIDTHS)('on how the open menu looks at %ipx', async (width) => {
		await expectSameScreenshots((engine) =>
			withPage(engine, { pinFont: true, viewport: { width, height: 300 } }, async (page) => {
				await page.click('.menu-toggle');
				await page.mouse.move(0, 299);
				await page.locator('.menu-toggle').blur();
				return page.screenshot({ clip: { x: 0, y: 0, width, height: 300 } });
			}),
		);
	});

	it.each(WIDE_WIDTHS)('on how the row of links looks at %ipx', async (width) => {
		await expectSameScreenshots((engine) =>
			withPage(engine, { pinFont: true, viewport: { width, height: 300 } }, (page) =>
				page.screenshot({ clip: { x: 0, y: 0, width, height: 64 } }),
			),
		);
	});
});
