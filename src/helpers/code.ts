
import { HelperOptions } from 'handlebars';
import hljs from 'highlight.js'

export default function (opt: HelperOptions) {
	//console.log({ hljs });
	//console.log({ arg }, arg.data.root);

	let code = opt.fn(null);
	code = code.replace(/\t/g, '   ');
	let parts = code.split('\n');
	let min = Math.min(
		...parts
			.filter(l => l.length > 0)
			.map(l => (l.match(/^ */) ?? [''])[0].length)
	);
	parts = parts.map(l => l.slice(min));
	code = parts.join('\n');
	let html = hljs.highlightAuto(code, ['html', 'css', 'js']);

	return `<pre><code class="hljs">${html.value}</code></pre>`;
}
