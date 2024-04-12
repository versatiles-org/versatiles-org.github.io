import { resolve } from 'node:path';
import { HelperDelegate } from 'handlebars';
import { unified } from 'unified'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import { matter } from 'vfile-matter'
import { readFileSync } from 'node:fs';

export type WrappedProcessor = (text: string) => Promise<{ text: string; data: Record<string, string> }>
export interface Partials {
	header: string;
	footer: string;
}

export function getProcessor(): WrappedProcessor {
	const processor = unified()
		.use(remarkParse)
		.use(remarkFrontmatter, ['yaml'])
		.use(() => (ast, vfile) => matter(vfile))
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeStringify, { allowDangerousHtml: true })
		.use(rehypeHighlight);

	return async (text: string) => {
		const result = await processor.process(text);
		return {
			text: result.toString(),
			data: (result.data.matter ?? {}) as Record<string, string>,
		}
	};
}

export function getPartials(srcPath: string): Partials {
	const [header, footer] = ['header', 'footer'].map((name) =>
		readFileSync(resolve(srcPath, `partials/${name}.html`), 'utf8')
	);
	return { header, footer };
}

export async function getHandlebars(srcPath: string, dstPath: string): Promise<typeof Handlebars> {
	const handlebars = (await import('handlebars')).default;

	register(await import('./merge_css.ts'));
	register(await import('../charts/chart_flow.ts'));

	return handlebars;

	async function register(module: { name: string; helper: (srcPath: string, dstPath: string) => HelperDelegate }) {
		let fun: HelperDelegate = module.helper(srcPath, dstPath);

		handlebars.registerHelper(module.name, (...args) => {
			try {
				return fun(...args)
			} catch (err) {
				console.error(err);
				return '<h1 style="color:red">' + String(err) + '</h1>'
			}
		});
	}
}
