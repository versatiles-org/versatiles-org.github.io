import { parse as parseYaml } from 'yaml';

/**
 * Recognises a YAML front matter block and captures it alongside the body.
 *
 * Accepts the three opening delimiters GitHub and static site generators use
 * interchangeably — `---`, `---yaml` and `= yaml =` — an optional leading BOM,
 * and both Unix and Windows line endings. The front matter group is lazy so
 * that a `---` inside the body cannot be mistaken for the closing delimiter,
 * and both groups are optional: `---\n---\n` is an empty but valid block.
 *
 * Kept identical to the pattern `@std/front-matter` used before it was
 * replaced, so existing content and its error behaviour stay untouched.
 */
const YAML_FRONT_MATTER =
	/^﻿?(?:---yaml|= yaml =|---)\s*\r?\n\s*(?:(?<frontMatter>.+?)\s*\r?\n)?(?:= yaml =|---)\s*(?:\r?\n(?<body>.+))?$/is;

/** A file split into its YAML front matter and the content below it. */
export interface FrontMatter {
	/** The raw YAML source, without the delimiters. */
	frontMatter: string;
	/** Everything after the closing delimiter. */
	body: string;
	/** The parsed YAML, or `{}` when the block is empty. */
	attrs: unknown;
}

/**
 * Splits YAML front matter off a document and parses it.
 *
 * @param text - Raw file content, starting with a front matter delimiter
 * @returns The raw YAML, the body below it, and the parsed attributes
 * @throws {TypeError} If the text has no complete front matter block
 *
 * @example
 * ```ts
 * const { body, attrs } = extractYaml('---\ntitle: Hi\n---\nHello');
 * // body === 'Hello', attrs === { title: 'Hi' }
 * ```
 */
export function extractYaml(text: string): FrontMatter {
	const groups = YAML_FRONT_MATTER.exec(text)?.groups;
	// Same message as @std/front-matter threw, because tests and callers match on it.
	if (!groups) throw new TypeError('Unexpected end of input');

	const { frontMatter = '', body = '' } = groups;
	return { frontMatter, body, attrs: frontMatter ? parseYaml(frontMatter) : {} };
}
