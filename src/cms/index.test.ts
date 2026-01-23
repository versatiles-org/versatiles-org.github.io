import { join } from '@std/path/join';
import { existsSync, walkSync } from '@std/fs';
import CMS from './index.ts';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';

describe('CMS builds site structure', () => {
	let srcPath: string;
	let dstPath: string;

	beforeAll(() => {
		// Use temp directories to avoid polluting project root
		srcPath = Deno.makeTempDirSync({ prefix: 'cms_test_src_' });
		dstPath = Deno.makeTempDirSync({ prefix: 'cms_test_dst_' });

		// Arrange
		Deno.mkdirSync(join(srcPath, 'assets/style'), { recursive: true });
		Deno.writeTextFileSync(join(srcPath, 'assets/style/main.less'), 'body{}');
		Deno.writeTextFileSync(join(srcPath, 'assets/style/menu.less'), 'nav{}');
		Deno.writeTextFileSync(join(srcPath, 'assets/style/hero.less'), '.hero{}');
		Deno.writeTextFileSync(join(srcPath, 'assets/style/ignore.png'), '');
		Deno.writeTextFileSync(join(srcPath, 'assets/logo.png'), 'PNGDATA');
		Deno.writeTextFileSync(
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
		Deno.removeSync(srcPath, { recursive: true });
		Deno.removeSync(dstPath, { recursive: true });
	});

	it('builds the site structure', async () => {
		const cms = new CMS(srcPath, dstPath);

		// Act
		await cms.build();

		// Assert
		expect(existsSync(join(dstPath, 'assets', 'logo.png'))).toBe(true);
		expect(existsSync(join(dstPath, 'assets', 'style.css'))).toBe(true);
		expect(existsSync(join(dstPath, 'test.html'))).toBe(true);

		const html = Deno.readTextFileSync(join(dstPath, 'test.html'));
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<title>Test Title</title>');
		expect(html).toContain('<meta name="description" content="Test Desc">');
		expect(html).toContain('<p>Hello World!</p>');

		// .less files should be removed
		for (const entry of walkSync(join(dstPath, 'assets', 'style'))) {
			expect(entry.name.endsWith('.less')).toBe(false);
		}
	});
});

describe('CMS error handling', () => {
	it('throws descriptive error for invalid markdown front matter', async () => {
		const srcPath = Deno.makeTempDirSync({ prefix: 'cms_error_test_src_' });
		const dstPath = Deno.makeTempDirSync({ prefix: 'cms_error_test_dst_' });

		try {
			// Create required LESS files and an asset (to ensure assets dir is created)
			Deno.mkdirSync(join(srcPath, 'assets/style'), { recursive: true });
			Deno.writeTextFileSync(join(srcPath, 'assets/style/main.less'), 'body{}');
			Deno.writeTextFileSync(join(srcPath, 'assets/style/menu.less'), 'nav{}');
			Deno.writeTextFileSync(join(srcPath, 'assets/style/hero.less'), '.hero{}');
			Deno.writeTextFileSync(join(srcPath, 'assets/logo.png'), 'PNG');

			// Create markdown file with missing required front matter (missing description and menuEntry)
			Deno.writeTextFileSync(
				join(srcPath, 'invalid.md'),
				['---', 'title: Only Title', '---', 'Content'].join('\n'),
			);

			const cms = new CMS(srcPath, dstPath);
			await expect(cms.build()).rejects.toThrow('Failed to process page');
		} finally {
			Deno.removeSync(srcPath, { recursive: true });
			Deno.removeSync(dstPath, { recursive: true });
		}
	});

	it('throws descriptive error for missing CSS source files', async () => {
		const srcPath = Deno.makeTempDirSync({ prefix: 'cms_css_error_test_src_' });
		const dstPath = Deno.makeTempDirSync({ prefix: 'cms_css_error_test_dst_' });

		try {
			// Create only some of the required LESS files (missing hero.less)
			Deno.mkdirSync(join(srcPath, 'assets/style'), { recursive: true });
			Deno.writeTextFileSync(join(srcPath, 'assets/style/main.less'), 'body{}');
			Deno.writeTextFileSync(join(srcPath, 'assets/style/menu.less'), 'nav{}');
			// Intentionally NOT creating hero.less

			const cms = new CMS(srcPath, dstPath);
			await expect(cms.build()).rejects.toThrow('Failed to build CSS');
		} finally {
			Deno.removeSync(srcPath, { recursive: true });
			Deno.removeSync(dstPath, { recursive: true });
		}
	});
});
