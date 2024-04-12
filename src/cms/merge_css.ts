
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { minify } from 'csso';
import { resolve } from 'node:path';
import { HelperOptions } from 'handlebars';
import less from 'less';

export const name = 'merge_css';
export function helper(srcPath: string, dstPath: string) {
	const cache = new Set<string>();

	return function (filename: string, arg: HelperOptions) {
		if (!filename.match(/\.(c|le)ss$/)) throw Error();
		const content = arg.fn(null);
		const links = getLinks(content);

		const key = [filename, ...links].join(';');
		if (!cache.has(key)) {
			cache.add(key);
			buildCSS(filename, links);
		}

		return `<link rel="stylesheet" href="${filename}" />`;
	}

	function getLinks(content: string): string[] {
		const node = new JSDOM(content);
		const nodes = node.window.document.querySelectorAll('link');
		const links = Array.from(nodes).map(link => {
			const href = link.getAttribute('href');
			if (href == null) throw Error();
			return href;
		});
		return links;
	}

	async function buildCSS(filename: string, cssFilenames: string[]) {
		const cssList = await Promise.all(cssFilenames.map(async cssFilename => {
			cssFilename = resolve(srcPath, cssFilename);
			let content = readFileSync(cssFilename, 'utf8');
			if (cssFilename.endsWith('.less')) content = (await less.render(content)).css;
			return content;
		}));
		const cssMini = minify(cssList.join('\n'), { comments: false }).css;

		writeFileSync(resolve(dstPath, filename), cssMini);
	}
}