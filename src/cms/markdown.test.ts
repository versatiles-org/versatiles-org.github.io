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
});
