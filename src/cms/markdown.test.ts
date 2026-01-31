import { expect } from '@std/expect';
import { parseMarkdown } from './markdown.ts';
import { describe, it } from '@std/testing/bdd';

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
		const input = [
			'---',
			'title: Test',
			'description: Test description',
			'---',
			'Content',
		].join('\n');

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
		const input = [
			'---',
			'title: Test',
			'menuEntry: test',
			'---',
			'Content',
		].join('\n');

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
