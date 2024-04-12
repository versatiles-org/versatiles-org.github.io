import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import Handlebars, { HelperDelegate } from 'handlebars';
import Context from '../lib/context.ts';
import menuGenerator from '../helpers/menu.ts';
import { unified } from 'unified'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import { matter } from 'vfile-matter'
import { readFileSync } from 'node:fs';
import { AbstractModule } from './module.ts';

export default class Pages extends AbstractModule {
	async build() {
		const { context } = this;
		const path = resolve(context.srcPath, 'pages');

		const [header, footer] = ['header', 'footer'].map((name) =>
			readFileSync(resolve(context.srcPath, `partials/${name}.html`), 'utf8')
		);

		register(await import('../helpers/merge_css.ts'));
		register(await import('../charts/chart_flow.ts'));

		const processor = unified()
			.use(remarkParse)
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
					menu: menuGenerator(filename),
					github_link: `https://github.com/versatiles-org/versatiles-website/blob/main/docs/pages/${filename}`,
				});

				await writeFile(resolve(context.dstPath, pagename + '.html'), html);
			} catch (error) {
				console.error('Error for page ' + pagename);
				throw error;
			}
		}))


		async function register(module: { name: string; helper: (ctx: Context) => HelperDelegate }) {
			let fun: HelperDelegate = module.helper(context);

			Handlebars.registerHelper(module.name, (...args) => {
				try {
					return fun(...args)
				} catch (err) {
					console.error(err);
					return '<h1 style="color:red">' + String(err) + '</h1>'
				}
			});
		}
	}
}