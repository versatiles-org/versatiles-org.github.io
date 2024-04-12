
export default class Context {
	public readonly srcPath: string;
	public readonly dstPath: string;

	constructor(srcPath: string, dstPath: string) {
		this.srcPath = srcPath;
		this.dstPath = dstPath;
	}
}
