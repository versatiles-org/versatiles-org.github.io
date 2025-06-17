import { extractYaml } from '@std/front-matter';
import { render, Renderer } from '@deno/gfm';

class MarkdownRenderer extends Renderer {
	override heading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6): string {
		return `<h${level}>${text}</h${level}>`;
	}
}

interface MarkdownResult {
	html: string;
	attrs: {
		menuEntry: string;
		title: string;
		description: string;
		githubLink?: string;
	};
}

export function parseMarkdown(yaml: string): MarkdownResult {
	const { body, attrs } = extractYaml(yaml);
	if (typeof body !== 'string') throw new TypeError('Markdown body must be a string');

	if (typeof attrs !== 'object' || attrs === null) throw new TypeError('Markdown attributes must be an object');
	if (!('menuEntry' in attrs) || typeof attrs.menuEntry !== 'string') throw new TypeError('Markdown attributes must contain a string "menuEntry"');
	if (!('title' in attrs) || typeof attrs.title !== 'string') throw new TypeError('Markdown attributes must contain a string "title"');
	if (!('description' in attrs) || typeof attrs.description !== 'string') throw new TypeError('Markdown attributes must contain a string "description"');

	return {
		attrs: attrs as MarkdownResult['attrs'],
		html: render(body, { disableHtmlSanitization: true, renderer: new MarkdownRenderer() }),
	};
}
