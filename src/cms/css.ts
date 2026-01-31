import less from 'less';
import { CSS } from '@deno/gfm';
import CleanCSS from 'clean-css';

/**
 * Selectors from @deno/gfm's markdown-body styles that should be excluded.
 * These either conflict with custom styles or are unnecessary for this CMS.
 */
const EXCLUDED_MARKDOWN_SELECTORS = [
	// Pseudo-elements and pseudo-classes
	':',
	// Direct child selectors
	'>',
	// Heading styles (handled by custom CSS)
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	// Link styles (handled by custom CSS)
	'a',
	// iframe styles (not used)
	'iframe',
	// Table styles (handled by custom CSS)
	'table',
	'thead',
	'tbody',
	'th',
	'td',
	'tr',
];

/**
 * Check if a CSS rule line should be filtered out.
 * Returns true if the line should be KEPT, false if it should be removed.
 */
function shouldKeepMarkdownRule(line: string): boolean {
	// Keep non-markdown-body rules
	if (!line.startsWith('.markdown-body')) return true;

	// Extract the selector part after ".markdown-body"
	const selectorPart = line.split('{')[0].slice('.markdown-body'.length).trim();

	// Remove empty .markdown-body{} rules
	if (!selectorPart) return false;

	// Remove rules matching excluded selectors
	for (const excluded of EXCLUDED_MARKDOWN_SELECTORS) {
		if (selectorPart.startsWith(excluded)) return false;
	}

	return true;
}

/**
 * Builds a single minified CSS file from multiple source files.
 *
 * This function reads the provided source CSS or LESS files, compiles LESS files to CSS,
 * appends the default CSS from `@deno/gfm`, minifies the combined CSS using CleanCSS,
 * and writes the result to the specified destination file.
 *
 * @param srcFilenames - An array of source file paths (CSS or LESS files) to include.
 * @param dstFilename - The destination file path where the minified CSS will be written.
 * @returns A Promise that resolves when the CSS file has been written.
 */
export async function buildCSS(srcFilenames: string[], dstFilename: string): Promise<void> {
	// Read and compile all source files
	const cssList = await Promise.all(srcFilenames.map(async (cssFilename) => {
		let content = await Deno.readTextFile(cssFilename);
		if (cssFilename.endsWith('.less')) {
			content = (await less.render(content)).css;
		}
		return content;
	}));

	// Add GFM styles, removing the base .markdown-body{} rule which sets unwanted defaults
	const gfmStyles = CSS.replace(/\.markdown-body\s*\{[^}]*\}/g, '');
	cssList.push(gfmStyles);

	// Minify with CleanCSS, configured to output one rule per line for filtering
	const minified = new CleanCSS({
		format: { breaks: { afterRuleEnds: true } },
	}).minify(cssList.join('\n'));

	if (minified.errors.length > 0) {
		throw new Error(`CSS minification errors: ${minified.errors.join(', ')}`);
	}

	// Filter out unwanted markdown-body rules
	const css = (minified.styles as string)
		.split('\n')
		.filter(shouldKeepMarkdownRule)
		.join('\n');

	await Deno.writeTextFile(dstFilename, css);
}
