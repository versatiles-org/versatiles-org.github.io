
export default function (arg) {
	let { filename } = arg.data.root;
	if (filename === 'index.html') filename = '';

	let links = [
		{ href: '', title: 'Demo' },
		{ href: 'guide.html', title: 'Intro' },
		{ href: 'overview.html', title: 'Overview' },
		{ href: 'contribute.html', title: 'Contribute' },
	];

	links.forEach(l => {
		if (l.href === filename) l.add = ' class="selected"'
	})

	return links.map(
		({ href, title, add }) => `<li${add || ''}><a href="/${href}">${title}</a></li>`
	).join('')
}