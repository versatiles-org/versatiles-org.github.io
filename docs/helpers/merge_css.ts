
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { minify } from 'csso';
import { resolve } from 'node:path';
import { HelperOptions } from 'handlebars';

export default function (filename: string, arg: HelperOptions) {
	if (!filename.endsWith('.css')) throw Error();
	const content = arg.fn(null);
	const node = new JSDOM(content);
	const nodes = node.window.document.querySelectorAll('link');
	const links = Array.from(nodes).map(link => {
		const href = link.getAttribute('href');
		if (href == null) throw Error();
		return href;
	});
	let css = links.map(filename => readFileSync(filename, 'utf8')).join('\n');
	css = minify(css, { comments: false }).css;

	writeFileSync(resolve('../dist', filename), css);

	return `<link rel="stylesheet" href="${filename}" />`;
}
