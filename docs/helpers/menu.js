
export default function (arg) {
	let { filename } = arg.data.root;
	if (filename === 'index.html') filename = '';

	let links = [
		{ href: '', title: 'Demo' },
		{ href: 'guide.html', title: 'Intro' },
		{ href: 'overview.html', title: 'Overview' },
		{ href: 'contribute.html', title: 'Help' },
	];

	links.forEach(l => {
		if (l.href === filename) l.add = ' class="selected"'
	})

	return '<nav><ul>' + links.map(
		({ href, title, add }) => `<li${add || ''}><a href="/${href}">${title}</a></li>`
	).join('') + '</ul></nav>'
}