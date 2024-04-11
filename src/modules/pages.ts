import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import Handlebars from 'handlebars';
import Context from '../lib/context.ts';
import menuGenerator from '../helpers/menu.ts';
import { Processor, unified } from 'unified'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import { matter } from 'vfile-matter'

export async function build(context: Context) {
	const path = resolve(context.srcPath, 'pages');

	const [header, footer] = await Promise.all(
		['header', 'footer'].map(getPartial)
	);

	const filenames = (await readdir(path)).flatMap(filename => {
		return filename.endsWith('.md') ? [filename] : []
	});


	const processor = unified()
		.use(remarkParse)
		.use(remarkStringify)
		.use(remarkFrontmatter, ['yaml'])
		.use(() => (ast, vfile) => matter(vfile))
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeStringify, { allowDangerousHtml: true })
		.use(rehypeHighlight)
	//.use(() => ast => {
	//	console.dir(ast, { depth: 6 });
	//	// @ts-ignore
	//	//if (ast.children[0].value === 'title: VersaTiles') console.dir(ast)
	//})

	await Promise.all(filenames.map(async filename => {
		const pagename = basename(filename, '.md');
		try {
			const content = await readFile(resolve(path, filename), 'utf8');
			const result = await processor.process(content);
			const data = result.data.matter;

			if (typeof data !== 'object' || data == null) throw Error('missing data');
			if (!('title' in data) || (typeof data.title !== 'string')) throw Error('missing title');

			const handlebarData = {
				...data,
				menu: menuGenerator({ filename }),
				github_link: `https://github.com/versatiles-org/versatiles-website/blob/main/docs/pages/${filename}`,
			};

			const html = [
				header(handlebarData),
				result.toString(),
				footer(handlebarData)
			].join('\n');

			await writeFile(resolve(context.dstPath, pagename + '.html'), html);
		} catch (error) {
			console.error('Error for page ' + pagename);
			throw error;
		}
	}))

	async function getPartial(name: string): Promise<HandlebarsTemplateDelegate<any>> {
		const filename = resolve(context.srcPath, `partials/${name}.html`);
		const html = await readFile(filename, 'utf8');
		return Handlebars.compile(html);
	}
}
