import less from 'less';
import { CSS } from '@deno/gfm';
import CleanCSS from 'npm:clean-css';

export async function buildCSS(srcFilenames: string[], dstFilename: string): Promise<void> {
	const cssList = await Promise.all(srcFilenames.map(async cssFilename => {
		let content = await Deno.readTextFile(cssFilename);
		if (cssFilename.endsWith('.less')) content = (await less.render(content)).css;
		return content;
	}));
	cssList.push(CSS);

	const css = new CleanCSS({ format: { breaks: { afterRuleEnds: true } } }).minify(cssList.join('\n'));
	console.log(css);

	await Deno.writeTextFile(dstFilename, css.styles);
}
