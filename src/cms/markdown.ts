import he from 'he';
import { Marked, Renderer, type Tokens } from 'marked';
import markedAlert from 'marked-alert';
import markedFootnote from 'marked-footnote';
import Prism from 'prismjs';
import 'prismjs/components/prism-yaml.js';
import { extractYaml } from './frontMatter.ts';

/**
 * Markdown engine: GitHub Flavored Markdown, plus GitHub's alert blockquotes
 * (`> [!NOTE]`) and footnotes, which the content uses.
 *
 * The `walkTokens` hook is inherited from `@deno/gfm`, whose renderer this file
 * reproduces: putting a list inside a `<summary>` needs a blank line after the
 * closing tag, but that blank line should not end up in the output.
 */
const marked = new Marked(markedAlert(), markedFootnote(), {
	walkTokens: (token) => {
		if (token.type === 'html' && token.text.endsWith('</summary>\n\n')) {
			token.text = token.text.replace('</summary>\n\n', '</summary>\n');
		}
	},
});

/**
 * Markdown renderer matching the HTML this site has always shipped.
 *
 * `heading` is this site's own: plain heading tags, without the slug id and
 * anchor link GitHub adds. The other three keep `@deno/gfm`'s output, which the
 * stylesheet in `github-markdown.css` is written against — external links carry
 * `rel="noopener noreferrer"`, images always carry a `title` attribute, and
 * fenced code is wrapped in the `.highlight` element that the Prism token
 * colours are scoped to.
 */
class MarkdownRenderer extends Renderer {
	override heading({ tokens, depth }: Tokens.Heading): string {
		const text = this.parser.parseInline(tokens);
		return `<h${depth}>${text}</h${depth}>`;
	}

	override image({ href, title, text }: Tokens.Image): string {
		return `<img src="${href}" alt="${text}" title="${title ?? ''}" />`;
	}

	override link({ href, title, tokens }: Tokens.Link): string {
		const text = this.parser.parseInline(tokens);
		const titleAttr = title ? ` title="${title}"` : '';
		if (href.startsWith('#')) return `<a href="${href}"${titleAttr}>${text}</a>`;
		return `<a href="${href}"${titleAttr} rel="noopener noreferrer">${text}</a>`;
	}

	override code({ text, lang }: Tokens.Code): string {
		// An info string is either a bare language, a comma-separated list whose first
		// entry counts (`ts, ignore` is really `ts`), or a language plus a title
		// (`js title="example.js"`). Lowercased for parity with GitHub.
		const titleMatch = lang?.match(/\stitle="(.+)"/);
		const info = titleMatch ? lang?.split(' ')[0] : lang;
		const language = info?.split(',')[0]?.toLocaleLowerCase();

		const grammar =
			language && Object.hasOwn(Prism.languages, language)
				? Prism.languages[language]
				: undefined;
		if (!language || grammar === undefined) {
			return `<pre><code class="notranslate">${he.encode(text)}</code></pre>`;
		}

		const titleHTML = titleMatch ? `<div class="markdown-code-title">${titleMatch[1]}</div>` : '';
		const codeHTML = Prism.highlight(text, grammar, language);
		return `<div class="highlight highlight-source-${language} notranslate">${titleHTML}<pre>${codeHTML}</pre></div>`;
	}
}

/**
 * Renders Markdown to HTML.
 *
 * SECURITY: raw HTML in the source passes through untouched — there is no
 * sanitization step. All content comes from trusted sources (the `docs/`
 * directory of this repository), which is what lets markdown files embed HTML
 * for advanced formatting. Never render untrusted input through this module.
 */
function renderMarkdown(markdown: string): string {
	return marked.parse(markdown, {
		gfm: true,
		breaks: false,
		async: false,
		renderer: new MarkdownRenderer(),
	});
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
		html: renderMarkdown(body),
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
	return renderMarkdown(text)
		.trim()
		.replace(/^<p>/, '')
		.replace(/<\/p>$/, '')
		.trim();
}
