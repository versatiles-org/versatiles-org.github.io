
import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { minify } from 'csso';
import { resolve } from 'node:path';

export default function (filename, arg) {
	if (!filename.endsWith('.css')) throw Error();
	let content = arg.fn();
	content = new JSDOM(content);
	content = content.window.document.querySelectorAll('link');
	content = Array.from(content).map(link => link.getAttribute('href'));
	content = content.map(filename => readFileSync(filename, 'utf8'));
	content = content.join('\n');
	content = minify(content, { comments: false }).css;

	writeFileSync(resolve('../dist', filename), content);

	return `<link rel="stylesheet" href="${filename}" />`;
}
