import markdownit from 'markdown-it';

export default class Context {
	public readonly srcPath: string;
	public readonly dstPath: string;
	public readonly md: markdownit;

	constructor(srcPath: string, dstPath: string) {
		this.srcPath = srcPath;
		this.dstPath = dstPath;
		this.md = markdownit({
			html:true,
			breaks:true,
			linkify:true,
			
		});
	}
}
