import { extractYaml } from '@std/front-matter';
import { render } from '@deno/gfm';

interface MarkdownResult {
	html: string;
	attrs: Record<string, string>;
}

export function parseMarkdown(yaml: string): MarkdownResult {
	const { body, attrs } = extractYaml(yaml);

	return {
		attrs: (attrs ?? {}) as Record<string, string>,
		html: render(body),
	};
}
