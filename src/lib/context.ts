import { Processor, unified } from 'unified'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkRehype from 'remark-rehype'
import { matter } from 'vfile-matter'

export default class Context {
	public readonly srcPath: string;
	public readonly dstPath: string;
	public readonly v: string;
	public readonly md: Processor;

	constructor(srcPath: string, dstPath: string) {
		this.srcPath = srcPath;
		this.dstPath = dstPath;
		this.v = '?v=' + Date.now();
		// @ts-ignore
		this.md = unified()
			.use(remarkParse)
			.use(remarkStringify)
			.use(remarkFrontmatter, ['yaml'])
			.use(() => (ast, vfile) => matter(vfile))
			.use(remarkGfm)
			.use(remarkRehype, { allowDangerousHtml: true })
			.use(rehypeStringify, { allowDangerousHtml: true })
			//.use(() => ast => {
			//	console.dir(ast, { depth: 6 });
			//	// @ts-ignore
			//	//if (ast.children[0].value === 'title: VersaTiles') console.dir(ast)
			//})
	}
}
