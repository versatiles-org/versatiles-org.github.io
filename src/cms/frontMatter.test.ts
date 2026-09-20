import { describe, expect, it } from 'vitest';
import { extractYaml } from './frontMatter.ts';

describe('extractYaml', () => {
	it('splits front matter from the body', () => {
		const result = extractYaml('---\ntitle: Hi\ncount: 2\n---\n# Heading\n\nText.\n');

		expect(result.frontMatter).toBe('title: Hi\ncount: 2');
		expect(result.body).toBe('# Heading\n\nText.\n');
		expect(result.attrs).toStrictEqual({ title: 'Hi', count: 2 });
	});

	it.each(['---', '---yaml', '= yaml ='])('accepts "%s" as opening delimiter', (open) => {
		const { attrs, body } = extractYaml(`${open}\ntitle: Hi\n---\nText.`);

		expect(attrs).toStrictEqual({ title: 'Hi' });
		expect(body).toBe('Text.');
	});

	it('accepts a leading BOM and CRLF line endings', () => {
		const { attrs, body } = extractYaml('﻿---\r\ntitle: Hi\r\n---\r\nText.');

		expect(attrs).toStrictEqual({ title: 'Hi' });
		expect(body).toBe('Text.');
	});

	it('keeps a "---" inside the body out of the front matter', () => {
		const { frontMatter, body } = extractYaml('---\ntitle: Hi\n---\nBefore\n\n---\n\nAfter\n');

		expect(frontMatter).toBe('title: Hi');
		expect(body).toBe('Before\n\n---\n\nAfter\n');
	});

	it('treats an empty block as empty attributes', () => {
		expect(extractYaml('---\n---\nText.')).toStrictEqual({
			frontMatter: '',
			body: 'Text.',
			attrs: {},
		});
	});

	it('reports an empty body rather than dropping it', () => {
		expect(extractYaml('---\ntitle: Hi\n---\n').body).toBe('');
	});

	it('throws when there is no front matter', () => {
		expect(() => extractYaml('# No front matter\n')).toThrow('Unexpected end of input');
	});

	it('throws when the block is never closed', () => {
		expect(() => extractYaml('---\ntitle: Hi\n')).toThrow('Unexpected end of input');
	});

	it('throws on empty input', () => {
		expect(() => extractYaml('')).toThrow('Unexpected end of input');
	});
});
