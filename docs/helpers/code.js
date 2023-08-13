
import hljs from 'highlight.js'

export default function (arg) {
	//console.log({ hljs });
	//console.log({ arg }, arg.data.root);

	let code = arg.fn();
	code = code.replace(/\t/g, '   ');
	code = code.split('\n');
	let min = Math.min(...code.filter(l => l.length > 0).map(l => l.match(/^ */)[0].length));
	code = code.map(l => l.slice(min));
	code = code.join('\n');
	//console.log({ code });
	let html = hljs.highlightAuto(code, ['html', 'css', 'js']);
	//console.log({ html });

	return `<pre><code class="hljs">${html.value}</code></pre>`;
}
