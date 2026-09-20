import { readFile, writeFile } from 'node:fs/promises';
import less from 'less';
import CleanCSS from 'clean-css';

/**
 * GitHub's markdown styles for the `.markdown-body` prose wrapper, vendored as
 * a plain CSS file next to this module — see its header for provenance. Read
 * through a URL rather than a path so it resolves from the module, not the
 * working directory the build happens to run in.
 */
const markdownCSSPath = new URL('./github-markdown.css', import.meta.url);

/**
 * Builds a single minified CSS file from multiple source files.
 *
 * This function reads the provided source CSS or LESS files, compiles LESS files to CSS,
 * appends the vendored GitHub markdown styles, minifies the combined CSS using
 * CleanCSS, and writes the result to the specified destination file.
 *
 * @param srcFilenames - An array of source file paths (CSS or LESS files) to include.
 * @param dstFilename - The destination file path where the minified CSS will be written.
 * @returns A Promise that resolves when the CSS file has been written.
 */
export async function buildCSS(srcFilenames: string[], dstFilename: string): Promise<void> {
	// Read and compile all source files
	const cssList = await Promise.all(
		srcFilenames.map(async (cssFilename) => {
			let content = await readFile(cssFilename, 'utf8');
			if (cssFilename.endsWith('.less')) {
				content = (await less.render(content)).css;
			}
			return content;
		}),
	);

	// Markdown styles go last so they win against the site's own rules.
	cssList.push(await readFile(markdownCSSPath, 'utf8'));

	// Minify with CleanCSS, configured to output one rule per line so the result
	// stays diffable — and so the vendored markdown rules keep their one-per-line
	// shape in the output.
	const minified = new CleanCSS({
		format: { breaks: { afterRuleEnds: true } },
	}).minify(cssList.join('\n'));

	if (minified.errors.length > 0) {
		throw new Error(`CSS minification errors: ${minified.errors.join(', ')}`);
	}

	await writeFile(dstFilename, minified.styles as string);
}
