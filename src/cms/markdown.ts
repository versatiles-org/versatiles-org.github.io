import { extractYaml } from '@std/front-matter';
import { render, Renderer } from '@deno/gfm';

class MarkdownRenderer extends Renderer {
	override heading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6): string {
		return `<h${level}>${text}</h${level}>`;
	}
}

interface MarkdownResult {
	html: string;
	attrs: Record<string, string>;
}

export function parseMarkdown(yaml: string): MarkdownResult {
	const { body, attrs } = extractYaml(yaml);

	return {
		attrs: (attrs ?? {}) as Record<string, string>,
		html: render(body, { disableHtmlSanitization: true, renderer: new MarkdownRenderer() }),
	};
}
