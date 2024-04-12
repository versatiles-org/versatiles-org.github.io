
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { minify } from 'csso';
import { resolve } from 'node:path';
import { HelperOptions } from 'handlebars';
import less from 'less';

export const name = 'merge_css';
export function helper(srcPath: string, dstPath: string) {
	return function (filename: string, arg: HelperOptions) {
		if (!filename.match(/\.(c|le)ss$/)) throw Error();
		const content = arg.fn(null);
		const node = new JSDOM(content);
		const nodes = node.window.document.querySelectorAll('link');
		const links = Array.from(nodes).map(link => {
			const href = link.getAttribute('href');
			if (href == null) throw Error();
			return href;
		});

		(async () => {
			let css = (await Promise.all(links.map(async filename => {
				filename = resolve(srcPath, filename);
				let content = readFileSync(filename, 'utf8');
				if (filename.endsWith('.less')) content = (await less.render(content)).css;
				return content;
			}))).join('\n');
			css = minify(css, { comments: false }).css;

			writeFileSync(resolve(dstPath, filename), css);
		})()

		return `<link rel="stylesheet" href="${filename}" />`;
	}
}