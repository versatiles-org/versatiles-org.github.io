import { join } from '@std/path/join';
import { existsSync, walkSync } from '@std/fs';
import CMS from './index.ts';
import { afterAll, describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';

describe('CMS builds site structure', () => {
	// Arrange
	const srcPath = 'test_src';
	const dstPath = 'test_dst';
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

	afterAll(() => {
		// Cleanup
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
