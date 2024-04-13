

const menu = [
	{ href: '', title: 'Demo' },
	{ href: 'intro.html', title: 'Intro' },
	{ href: 'overview.html', title: 'Overview' },
	{ href: 'contribute.html', title: 'Contribute' },
];

export function generateMenu(filename: string): string {
	if (filename === 'index.html') filename = '';

	return menu.map(
		({ href, title }) => `<li${href === filename ? ' class="selected"' : ''}><a href="/${href}">${title}</a></li>`,
	).join('');
}
