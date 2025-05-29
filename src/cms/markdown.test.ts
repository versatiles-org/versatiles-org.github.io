import { expect } from '@std/expect';
import { parseMarkdown } from './markdown.ts';
import { describe, it } from '@std/testing/bdd';

describe('parseMarkdown', () => {
	it('parseMarkdown extracts YAML front matter and renders markdown', () => {
		const input = [
			'---',
			'title: Test Title',
			'author: John Doe',
			'---',
			'# Hello World',
			'',
			'<span id="test">This is a test</span>',
			'',
			'This is a **test**.',
		].join('\n');

		const result = parseMarkdown(input);

		expect(result.attrs).toStrictEqual({ title: 'Test Title', author: 'John Doe' });
		expect(result.html).toBe(
			[
				'<h1 id="hello-world"><a class="anchor" aria-hidden="true" tabindex="-1" href="#hello-world"><svg class="octicon octicon-link" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill-rule="evenodd" d="M7.775 3.275a.75.75 0 001.06 1.06l1.25-1.25a2 2 0 112.83 2.83l-2.5 2.5a2 2 0 01-2.83 0 .75.75 0 00-1.06 1.06 3.5 3.5 0 004.95 0l2.5-2.5a3.5 3.5 0 00-4.95-4.95l-1.25 1.25zm-4.69 9.64a2 2 0 010-2.83l2.5-2.5a2 2 0 012.83 0 .75.75 0 001.06-1.06 3.5 3.5 0 00-4.95 0l-2.5 2.5a3.5 3.5 0 004.95 4.95l1.25-1.25a.75.75 0 00-1.06-1.06l-1.25 1.25a2 2 0 01-2.83 0z"></path></svg></a>Hello World</h1>',
				'<p><span id="test">This is a test</span></p>',
				'<p>This is a <strong>test</strong>.</p>',
				'',
			].join('\n'),
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
