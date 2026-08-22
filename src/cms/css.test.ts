import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildCSS } from './css.ts';

describe('buildCSS', () => {
	let tempDirectory: string;

	beforeAll(() => {
		tempDirectory = mkdtempSync(join(tmpdir(), 'css_test_'));
	});

	afterAll(() => {
		rmSync(tempDirectory, { recursive: true });
	});

	it('should build and minify CSS from multiple CSS files', async () => {
		writeFileSync(`${tempDirectory}/a.css`, 'body { color: red; }');
		writeFileSync(`${tempDirectory}/b.less`, 'h1 { color: blue; a { color:green } }');

		const srcFiles = [`${tempDirectory}/a.css`, `${tempDirectory}/b.less`];
		const dstFile = `${tempDirectory}/out.css`;

		await buildCSS(srcFiles, dstFile);

		const lines = readFileSync(dstFile, 'utf8').split('\n');
		expect(lines.length).toBe(139);
		expect(lines[0]).toBe('body{color:red}');
		expect(lines[1]).toBe('h1{color:#00f}');
		expect(lines[2]).toBe('h1 a{color:green}');
	});

	it('drops the GFM backdrop behind markdown images but keeps their layout rules', async () => {
		writeFileSync(`${tempDirectory}/base.css`, 'body{color:red}');
		const dstFile = `${tempDirectory}/img.css`;

		await buildCSS([`${tempDirectory}/base.css`], dstFile);

		const imgRules = readFileSync(dstFile, 'utf8')
			.split('\n')
			.filter((line) => line.startsWith('.markdown-body img{'));

		expect(imgRules.length).toBeGreaterThan(0);
		expect(imgRules.some((rule) => rule.includes('background-color'))).toBe(false);
		expect(imgRules.some((rule) => rule.includes('max-width:100%'))).toBe(true);
	});

	it('should throw error when source file does not exist', async () => {
		const srcFiles = [`${tempDirectory}/nonexistent.css`];
		const dstFile = `${tempDirectory}/out.css`;

		await expect(buildCSS(srcFiles, dstFile)).rejects.toThrow();
	});

	it('should throw error on invalid LESS syntax', async () => {
		writeFileSync(`${tempDirectory}/invalid.less`, 'body { color: }');

		const srcFiles = [`${tempDirectory}/invalid.less`];
		const dstFile = `${tempDirectory}/out.css`;

		await expect(buildCSS(srcFiles, dstFile)).rejects.toThrow();
	});
});
