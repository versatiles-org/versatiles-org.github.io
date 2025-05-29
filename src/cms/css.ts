import less from 'less';
import { CSS } from '@deno/gfm';
import CleanCSS from 'npm:clean-css';

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
	const cssList = await Promise.all(srcFilenames.map(async (cssFilename) => {
		let content = await Deno.readTextFile(cssFilename);
		if (cssFilename.endsWith('.less')) content = (await less.render(content)).css;
		return content;
	}));
	cssList.push(CSS);

	const css = new CleanCSS({ format: { breaks: { afterRuleEnds: true } } }).minify(
		cssList.join('\n'),
	);
	console.log(css);

	await Deno.writeTextFile(dstFilename, css.styles);
}
