import { parseMarkdown, renderInlineMarkdown } from './markdown.ts';
import { describe, expect, it } from 'vitest';

describe('parseMarkdown', () => {
	it('parseMarkdown extracts YAML front matter and renders markdown', () => {
		const input = [
			'---',
			'title: Test Title',
			'author: John Doe',
			'description: some description',
			'menuEntry: intro',
			'---',
			'# Hello World',
			'',
			'<span id="test">This is a test</span>',
			'',
			'This is a **test**.',
		].join('\n');

		const result = parseMarkdown(input);

		expect(result.attrs).toStrictEqual({
			title: 'Test Title',
			author: 'John Doe',
			description: 'some description',
			menuEntry: 'intro',
		});
		expect(result.html).toBe(
			'<h1>Hello World</h1><p><span id="test">This is a test</span></p>\n<p>This is a <strong>test</strong>.</p>\n',
		);
	});

	it('parseMarkdown errors on missing YAML front matter', () => {
		const input = '# No YAML\n\nJust some text.';
		expect(() => parseMarkdown(input)).toThrow('Unexpected end of input');
	});

	it('parseMarkdown errors on empty input', () => {
		const input = '';
		expect(() => parseMarkdown(input)).toThrow('Unexpected end of input');
	});

	it('renders headings at all levels without anchor links', () => {
		const input = [
			'---',
			'title: Headings Test',
			'description: Testing headings',
			'menuEntry: test',
			'---',
			'# H1',
			'## H2',
			'### H3',
			'#### H4',
			'##### H5',
			'###### H6',
		].join('\n');

		const result = parseMarkdown(input);

		expect(result.html).toContain('<h1>H1</h1>');
		expect(result.html).toContain('<h2>H2</h2>');
		expect(result.html).toContain('<h3>H3</h3>');
		expect(result.html).toContain('<h4>H4</h4>');
		expect(result.html).toContain('<h5>H5</h5>');
		expect(result.html).toContain('<h6>H6</h6>');
		expect(result.html).not.toContain('id=');
	});

	it('errors when menuEntry is missing', () => {
		const input = ['---', 'title: Test', 'description: Test description', '---', 'Content'].join(
			'\n',
		);

		expect(() => parseMarkdown(input)).toThrow(
			'Markdown attributes must contain a string "menuEntry"',
		);
	});

	it('errors when title is missing', () => {
		const input = [
			'---',
			'menuEntry: test',
			'description: Test description',
			'---',
			'Content',
		].join('\n');

		expect(() => parseMarkdown(input)).toThrow(
			'Markdown attributes must contain a string "title"',
		);
	});

	it('errors when description is missing', () => {
		const input = ['---', 'title: Test', 'menuEntry: test', '---', 'Content'].join('\n');

		expect(() => parseMarkdown(input)).toThrow(
			'Markdown attributes must contain a string "description"',
		);
	});

	it('errors when menuEntry is not a string', () => {
		const input = [
			'---',
			'title: Test',
			'description: Test description',
			'menuEntry: 123',
			'---',
			'Content',
		].join('\n');

		expect(() => parseMarkdown(input)).toThrow(
			'Markdown attributes must contain a string "menuEntry"',
		);
	});

	it('errors when title is not a string', () => {
		const input = [
			'---',
			'title: 123',
			'description: Test description',
			'menuEntry: test',
			'---',
			'Content',
		].join('\n');

		expect(() => parseMarkdown(input)).toThrow(
			'Markdown attributes must contain a string "title"',
		);
	});

	it('errors when description is not a string', () => {
		const input = [
			'---',
			'title: Test',
			'description: 123',
			'menuEntry: test',
			'---',
			'Content',
		].join('\n');

		expect(() => parseMarkdown(input)).toThrow(
			'Markdown attributes must contain a string "description"',
		);
	});

	it('preserves optional githubLink attribute', () => {
		const input = [
			'---',
			'title: Test',
			'description: Test description',
			'menuEntry: test',
			'githubLink: https://github.com/example',
			'---',
			'Content',
		].join('\n');

		const result = parseMarkdown(input);
		expect(result.attrs.githubLink).toBe('https://github.com/example');
	});

	it('renders embedded HTML correctly', () => {
		const input = [
			'---',
			'title: HTML Test',
			'description: Testing HTML',
			'menuEntry: test',
			'---',
			'<div class="custom">',
			'  <p>Custom HTML</p>',
			'</div>',
		].join('\n');

		const result = parseMarkdown(input);
		expect(result.html).toContain('<div class="custom">');
		expect(result.html).toContain('<p>Custom HTML</p>');
	});
});

describe('markdown rendering', () => {
	const frontMatter = ['---', 'title: T', 'description: D', 'menuEntry: m', '---'].join('\n');
	const render = (markdown: string): string => parseMarkdown(`${frontMatter}\n${markdown}`).html;

	it('marks external links as noopener, but leaves anchors alone', () => {
		const html = render('[ext](https://example.org) and [anchor](#here)');

		expect(html).toBe(
			'<p><a href="https://example.org" rel="noopener noreferrer">ext</a> and ' +
				'<a href="#here">anchor</a></p>\n',
		);
	});

	it('keeps a link title', () => {
		expect(render('[t](https://e.org "Tip")')).toContain(
			'<a href="https://e.org" title="Tip" rel="noopener noreferrer">t</a>',
		);
	});

	it('always gives images a title attribute', () => {
		expect(render('![alt text](foo.png)')).toBe(
			'<p><img src="foo.png" alt="alt text" title="" /></p>\n',
		);
	});

	it('highlights fenced code in a known language', () => {
		expect(render('```js\nconst a = 1;\n```')).toBe(
			'<div class="highlight highlight-source-js notranslate"><pre>' +
				'<span class="token keyword">const</span> a <span class="token operator">=</span> ' +
				'<span class="token number">1</span><span class="token punctuation">;</span>' +
				'</pre></div>',
		);
	});

	it('names the code title from the info string', () => {
		expect(render('```js title="example.js"\nlet a;\n```')).toContain(
			'<div class="markdown-code-title">example.js</div>',
		);
	});

	it('escapes fenced code in an unknown language instead of highlighting it', () => {
		expect(render('```rust\nlet x = "ä";\n```')).toBe(
			'<pre><code class="notranslate">let x = &#x22;&#xE4;&#x22;;</code></pre>',
		);
	});

	it('renders footnotes with a backlinked section', () => {
		const html = render('Claim.[^src]\n\n[^src]: The source.');

		expect(html).toContain(
			'<sup><a id="footnote-ref-src" href="#footnote-src" data-footnote-ref',
		);
		expect(html).toContain('<section class="footnotes" data-footnotes>');
		expect(html).toContain('<li id="footnote-src">');
	});

	it('renders GitHub alert blockquotes', () => {
		const html = render('> [!NOTE]\n> Remember.');

		expect(html).toContain('<div class="markdown-alert markdown-alert-note">');
		expect(html).toContain('<p class="markdown-alert-title">');
		expect(html).toContain('<p>Remember.</p>');
	});

	it('renders GFM tables', () => {
		expect(render('| a | b |\n|---|---|\n| 1 | 2 |')).toContain('<th>a</th>');
	});
});

describe('renderInlineMarkdown', () => {
	it('renders inline markup without the paragraph wrapper', () => {
		expect(renderInlineMarkdown('`BasicMap` for **VersaTiles**')).toBe(
			'<code>BasicMap</code> for <strong>VersaTiles</strong>',
		);
	});

	it('keeps links, with the same rel as block rendering', () => {
		expect(renderInlineMarkdown('[a](https://e.org)')).toBe(
			'<a href="https://e.org" rel="noopener noreferrer">a</a>',
		);
	});

	it('returns an empty string for empty input', () => {
		expect(renderInlineMarkdown('')).toBe('');
	});
});
