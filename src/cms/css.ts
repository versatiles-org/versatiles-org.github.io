import less from 'less';
import { CSS } from '@deno/gfm';

export async function buildCSS(srcFilenames: string[], dstFilename: string): Promise<void> {
	const cssList = await Promise.all(srcFilenames.map(async cssFilename => {
		let content = await Deno.readTextFile(cssFilename);
		if (cssFilename.endsWith('.less')) content = (await less.render(content)).css;
		return content;
	}));
	cssList.push(CSS);

	await Deno.writeTextFile(dstFilename, cssList.join('\n'));
}
