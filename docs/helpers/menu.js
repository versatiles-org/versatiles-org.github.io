
export default function (arg) {
	let { filename } = arg.data.root;
	if (filename === 'index.html') filename = '';

	let links = [
		{ href: '', title: 'Introduction' },
		{ href: 'overview.html', title: 'Overview' },
		{ href: 'how_to_use.html', title: 'How to use' },
		{ href: 'links.html', title: 'Links' },
	];

	links.forEach(l => {
		if (l.href === filename) l.title = `<b>${l.title}</b>`
	})

	return '<ul>' + links.map(({ href, title }) => `<li><a href="/${href}">${title}</a></li>`).join('') + '</ul>'
}