import markdownit from 'markdown-it';
import hljs from 'highlight.js';

export default class Context {
	public readonly srcPath: string;
	public readonly dstPath: string;
	public readonly md: markdownit;

	constructor(srcPath: string, dstPath: string) {
		this.srcPath = srcPath;
		this.dstPath = dstPath;
		const md: markdownit = this.md = markdownit({
			html: true,
			breaks: true,
			linkify: true,
			highlight: function (str, lang) {
				let content: string | undefined;
				if (lang && hljs.getLanguage(lang)) {
					try {
						content = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
					} catch (_) { }
				}
				content ??= md.utils.escapeHtml(str);
				return `<pre><code class="hljs">${content}</code></pre>`;
			}
		});
	}
}
