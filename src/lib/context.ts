import { Processor, unified } from 'unified'
import rehypeStringify from 'rehype-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
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
			.use(remarkFrontmatter, ['yaml'])
			.use(() => (ast, vfile) => matter(vfile))
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeStringify)
	}
}
