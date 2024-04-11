import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import Handlebars from 'handlebars';
import Context from '../lib/context.ts';
import menuGenerator from '../helpers/menu.ts';
import { unified } from 'unified'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import { matter } from 'vfile-matter'
import { readFileSync } from 'node:fs';

export async function build(context: Context) {
	const path = resolve(context.srcPath, 'pages');

	const [header, footer] = ['header', 'footer'].map((name) =>
		readFileSync(resolve(context.srcPath, `partials/${name}.html`), 'utf8')
	);

	const processor = unified()
		.use(remarkParse)
		.use(remarkStringify)
		.use(remarkFrontmatter, ['yaml'])
		.use(() => (ast, vfile) => matter(vfile))
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeStringify, { allowDangerousHtml: true })
		.use(rehypeHighlight);

	const filenames = (await readdir(path)).flatMap(filename => {
		return filename.endsWith('.md') ? [filename] : []
	});

	await Promise.all(filenames.map(async filename => {
		const pagename = basename(filename, '.md');
		try {
			const content = await readFile(resolve(path, filename), 'utf8');
			const result = await processor.process(content);
			const data = result.data.matter;

			if (typeof data !== 'object' || data == null) throw Error('missing data');
			if (!('title' in data) || (typeof data.title !== 'string')) throw Error('missing title');

			let html = [header, result.toString(), footer].join('\n');

			html = Handlebars.compile(html)({
				...data,
				menu: menuGenerator({ filename }),
				github_link: `https://github.com/versatiles-org/versatiles-website/blob/main/docs/pages/${filename}`,
			});

			await writeFile(resolve(context.dstPath, pagename + '.html'), html);
		} catch (error) {
			console.error('Error for page ' + pagename);
			throw error;
		}
	}))
}
