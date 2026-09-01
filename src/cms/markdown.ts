import { extractYaml } from '@std/front-matter';
import { type Marked, render, Renderer } from '@deno/gfm';

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
		/** Optional BCP-47 language tag for <html lang>, defaults to "en" */
		lang?: string;
		/** Optional layout name, added as a class on <main> (e.g. "prose") */
		layout?: string;
		/** Optional page-specific Open Graph image, absolute or site-root path */
		socialImage?: string;
		/** Alt text for socialImage */
		socialImageAlt?: string;
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
	if ('lang' in attrs && typeof attrs.lang !== 'string') {
		throw new TypeError('Markdown attribute "lang" must be a string, if present');
	}
	if ('layout' in attrs && typeof attrs.layout !== 'string') {
		throw new TypeError('Markdown attribute "layout" must be a string, if present');
	}
	// `attrs` is narrowed by the checks above, so index it through a plain record.
	const optional = attrs as Record<string, unknown>;
	for (const key of ['socialImage', 'socialImageAlt']) {
		if (key in optional && typeof optional[key] !== 'string') {
			throw new TypeError(`Markdown attribute "${key}" must be a string, if present`);
		}
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

/**
 * Renders a single line of Markdown to inline HTML, stripping the
 * outer `<p>` wrapper that GFM otherwise adds.
 *
 * Intended for short snippets like card titles, hooks, or labels —
 * not for multi-paragraph content.
 *
 * @param text - Markdown source (typically a single line)
 * @returns HTML with inline tags only
 */
export function renderInlineMarkdown(text: string): string {
	const html = render(text, {
		disableHtmlSanitization: true,
		renderer: new MarkdownRenderer(),
	}).trim();
	return html
		.replace(/^<p>/, '')
		.replace(/<\/p>$/, '')
		.trim();
}
