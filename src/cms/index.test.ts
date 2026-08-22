import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../config.ts';
import CMS, { canonicalUrl } from './index.ts';
import { walkFiles } from './walk.ts';

describe('CMS builds site structure', () => {
	let srcPath: string;
	let dstPath: string;

	beforeAll(() => {
		// Use temp directories to avoid polluting project root
		srcPath = mkdtempSync(join(tmpdir(), 'cms_test_src_'));
		dstPath = mkdtempSync(join(tmpdir(), 'cms_test_dst_'));

		// Arrange
		mkdirSync(join(srcPath, 'assets/style'), { recursive: true });
		writeFileSync(join(srcPath, 'assets/style/main.less'), 'body{}');
		writeFileSync(join(srcPath, 'assets/style/menu.less'), 'nav{}');
		writeFileSync(join(srcPath, 'assets/style/hero.less'), '.hero{}');
		writeFileSync(join(srcPath, 'assets/style/roadmap.less'), '#roadmap{}');
		writeFileSync(join(srcPath, 'assets/style/pipeline.less'), '#pipeline{}');
		writeFileSync(join(srcPath, 'assets/style/cards.less'), '.cards-section{}');
		writeFileSync(join(srcPath, 'assets/style/sponsor.less'), '.sponsor-btn{}');
		writeFileSync(join(srcPath, 'assets/style/ignore.png'), '');
		writeFileSync(join(srcPath, 'assets/logo.png'), 'PNGDATA');
		writeFileSync(
			join(srcPath, 'test.md'),
			[
				'---',
				'title: Test Title',
				'description: Test Desc',
				'menuEntry: test',
				'---',
				'Hello World!',
			].join('\n'),
		);
	});

	afterAll(() => {
		// Cleanup temp directories
		rmSync(srcPath, { recursive: true });
		rmSync(dstPath, { recursive: true });
	});

	it('builds the site structure', async () => {
		const cms = new CMS(srcPath, dstPath);

		// Act
		await cms.build();

		// Assert
		expect(existsSync(join(dstPath, 'assets', 'logo.png'))).toBe(true);
		expect(existsSync(join(dstPath, 'assets', 'style.css'))).toBe(true);
		expect(existsSync(join(dstPath, 'test.html'))).toBe(true);

		const html = readFileSync(join(dstPath, 'test.html'), 'utf8');
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<title>Test Title</title>');
		expect(html).toContain('<meta name="description" content="Test Desc">');
		expect(html).toContain('<p>Hello World!</p>');

		// .less files should be removed
		for (const entry of walkFiles(join(dstPath, 'assets', 'style'))) {
			expect(entry.name.endsWith('.less')).toBe(false);
		}
	});
});

describe('canonicalUrl', () => {
	it('maps the root index to the bare domain', () => {
		expect(canonicalUrl('index.html')).toBe('https://versatiles.org/');
	});

	it('maps top-level pages to a trailing-slash path', () => {
		expect(canonicalUrl('playground.md')).toBe('https://versatiles.org/playground/');
		expect(canonicalUrl('tools.md')).toBe('https://versatiles.org/tools/');
	});

	it('drops the index segment of nested pages', () => {
		expect(canonicalUrl('sources/index.page.ts')).toBe('https://versatiles.org/sources/');
		expect(canonicalUrl('satellite_demo/index.html')).toBe(
			'https://versatiles.org/satellite_demo/',
		);
	});

	it('keeps nested non-index pages', () => {
		expect(canonicalUrl('guide/setup.md')).toBe('https://versatiles.org/guide/setup/');
	});
});

describe('CMS error handling', () => {
	it('throws descriptive error for invalid markdown front matter', async () => {
		const srcPath = mkdtempSync(join(tmpdir(), 'cms_error_test_src_'));
		const dstPath = mkdtempSync(join(tmpdir(), 'cms_error_test_dst_'));

		try {
			// Create required LESS files and an asset (to ensure assets dir is created)
			mkdirSync(join(srcPath, 'assets/style'), { recursive: true });
			writeFileSync(join(srcPath, 'assets/style/main.less'), 'body{}');
			writeFileSync(join(srcPath, 'assets/style/menu.less'), 'nav{}');
			writeFileSync(join(srcPath, 'assets/style/hero.less'), '.hero{}');
			writeFileSync(join(srcPath, 'assets/style/roadmap.less'), '#roadmap{}');
			writeFileSync(join(srcPath, 'assets/style/pipeline.less'), '#pipeline{}');
			writeFileSync(join(srcPath, 'assets/style/cards.less'), '.cards-section{}');
			writeFileSync(join(srcPath, 'assets/style/sponsor.less'), '.sponsor-btn{}');
			writeFileSync(join(srcPath, 'assets/logo.png'), 'PNG');

			// Create markdown file with missing required front matter (missing description and menuEntry)
			writeFileSync(
				join(srcPath, 'invalid.md'),
				['---', 'title: Only Title', '---', 'Content'].join('\n'),
			);

			const cms = new CMS(srcPath, dstPath);
			await expect(cms.build()).rejects.toThrow('Failed to process page');
		} finally {
			rmSync(srcPath, { recursive: true });
			rmSync(dstPath, { recursive: true });
		}
	});

	it('throws descriptive error for incomplete .html front matter', async () => {
		const srcPath = mkdtempSync(join(tmpdir(), 'cms_html_fm_test_src_'));
		const dstPath = mkdtempSync(join(tmpdir(), 'cms_html_fm_test_dst_'));

		try {
			mkdirSync(join(srcPath, 'assets/style'), { recursive: true });
			for (const file of config.cssSourceFiles) {
				writeFileSync(join(srcPath, file), 'body{}');
			}
			// An asset so copyAssets creates dist/assets/, which buildCSS writes into.
			writeFileSync(join(srcPath, 'assets/logo.png'), 'PNG');

			// Front matter present but missing description and menuEntry.
			writeFileSync(
				join(srcPath, 'page.html'),
				['---', 'title: Only Title', '---', '<p>Content</p>'].join('\n'),
			);

			const cms = new CMS(srcPath, dstPath);
			await expect(cms.build()).rejects.toThrow('Failed to process page');
		} finally {
			rmSync(srcPath, { recursive: true });
			rmSync(dstPath, { recursive: true });
		}
	});

	it('throws descriptive error for missing CSS source files', async () => {
		const srcPath = mkdtempSync(join(tmpdir(), 'cms_css_error_test_src_'));
		const dstPath = mkdtempSync(join(tmpdir(), 'cms_css_error_test_dst_'));

		try {
			// Create only some of the required LESS files (missing hero.less)
			mkdirSync(join(srcPath, 'assets/style'), { recursive: true });
			writeFileSync(join(srcPath, 'assets/style/main.less'), 'body{}');
			writeFileSync(join(srcPath, 'assets/style/menu.less'), 'nav{}');
			// Intentionally NOT creating hero.less

			const cms = new CMS(srcPath, dstPath);
			await expect(cms.build()).rejects.toThrow('Failed to build CSS');
		} finally {
			rmSync(srcPath, { recursive: true });
			rmSync(dstPath, { recursive: true });
		}
	});
});
