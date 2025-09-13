import { buildCSS } from './css.ts';
import { describe, it } from '@std/testing/bdd';
import { expect } from '@std/expect';

describe('buildCSS', () => {
	it('should build and minify CSS from multiple CSS files', async () => {
		const tempDirectory = Deno.makeTempDirSync();
		Deno.writeTextFileSync(`${tempDirectory}/a.css`, 'body { color: red; }');
		Deno.writeTextFileSync(`${tempDirectory}/b.less`, 'h1 { color: blue; a { color:green } }');

		const srcFiles = [`${tempDirectory}/a.css`, `${tempDirectory}/b.less`];
		const dstFile = `${tempDirectory}/out.css`;

		await buildCSS(srcFiles, dstFile);

		const lines = Deno.readTextFileSync(dstFile).split('\n');
		expect(lines.length).toBe(147);
		expect(lines[0]).toBe('body{color:red}');
		expect(lines[1]).toBe('h1{color:#00f}');
		expect(lines[2]).toBe('h1 a{color:green}');
	});
});
