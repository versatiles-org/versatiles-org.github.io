import { HelperOptions } from 'handlebars';

export default function (opt: HelperOptions) {
	let { filename } = opt.data.root;
	if (filename === 'index.html') filename = '';

	let links = [
		{ href: '', title: 'Demo' },
		{ href: 'intro.html', title: 'Intro' },
		{ href: 'overview.html', title: 'Overview' },
		{ href: 'contribute.html', title: 'Contribute' },
	];

	return links.map(
		({ href, title }) => `<li${href === filename ? ' class="selected"' : ''}><a href="/${href}">${title}</a></li>`
	).join('')
}