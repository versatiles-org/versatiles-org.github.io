import { extractYaml } from '@std/front-matter';
import { Marked, render, Renderer } from '@deno/gfm';

/**
 * Custom Markdown renderer that outputs clean heading tags without anchor links.
 */
class MarkdownRenderer extends Renderer {
	override heading({ tokens, depth }: Marked.Tokens.Heading): string {
		const text = this.parser.parseInline(tokens);
		return `<h${depth}>${text}</h${depth}>`;
	}
}

/**
 * Result of parsing a Markdown file with YAML front matter.
 */
interface MarkdownResult {
	/** Rendered HTML content */
	html: string;
	/** Parsed front matter attributes */
	attrs: {
		/** Menu item identifier for highlighting active navigation */
		menuEntry: string;
		/** Page title for <title> tag and heading */
		title: string;
		/** Meta description for SEO */
		description: string;
		/** Optional custom GitHub edit link (auto-generated if not provided) */
		githubLink?: string;
	};
}

/**
 * Parses a Markdown file with YAML front matter into HTML and metadata.
 *
 * Expects front matter with required fields: title, description, menuEntry.
 * Renders Markdown to HTML using GitHub Flavored Markdown (GFM).
 *
 * @param yaml - Raw file content including YAML front matter and Markdown body
 * @returns Parsed result with HTML content and front matter attributes
 * @throws {TypeError} If front matter is missing or has invalid/missing required fields
 *
 * @example
 * ```ts
 * const content = `---
 * title: My Page
 * description: Page description
 * menuEntry: home
 * ---
 * # Hello World
 * `;
 * const { html, attrs } = parseMarkdown(content);
 * ```
 */
export function parseMarkdown(yaml: string): MarkdownResult {
	const { body, attrs } = extractYaml(yaml);
	if (typeof body !== 'string') throw new TypeError('Markdown body must be a string');

	if (typeof attrs !== 'object' || attrs === null) {
		throw new TypeError('Markdown attributes must be an object');
	}
	if (!('menuEntry' in attrs) || typeof attrs.menuEntry !== 'string') {
		throw new TypeError('Markdown attributes must contain a string "menuEntry"');
	}
	if (!('title' in attrs) || typeof attrs.title !== 'string') {
		throw new TypeError('Markdown attributes must contain a string "title"');
	}
	if (!('description' in attrs) || typeof attrs.description !== 'string') {
		throw new TypeError('Markdown attributes must contain a string "description"');
	}

	return {
		attrs: attrs as MarkdownResult['attrs'],
		// SECURITY: HTML sanitization is disabled because all markdown content comes from
		// trusted sources (docs/ directory in this repository). This allows embedding
		// raw HTML in markdown files for advanced formatting. Do not use this function
		// to parse untrusted user-provided content.
		html: render(body, { disableHtmlSanitization: true, renderer: new MarkdownRenderer() }),
	};
}
