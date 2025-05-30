import { type CheerioAPI, load } from 'npm:cheerio';

export interface MenuEntry {
	title: string;
	url: string;
}

export class Page {
	private $: CheerioAPI;

	constructor(template: string) {
		this.$ = load(template);
	}

	public setMenu(entries: MenuEntry[], menuEntry?: string): Page {
		const menuList = this.$('nav ul');
		menuList.empty();
		entries.forEach((entry) => {
			const className = entry.title === menuEntry ? ' class="selected"' : '';
			menuList.append(`<li${className}><a href="${entry.url}">${entry.title}</a></li>`);
		});
		menuList.append([
			'<li class="github-icon">',
			'<a href="https://github.com/versatiles-org/"></a>',
			'</li>',
		].join(''));
		return this;
	}

	public setTitle(title: string): Page {
		if (typeof title !== 'string') throw new TypeError('title must be a string');
		this.$('title').text(title);
		return this;
	}

	public setContent(content: string): Page {
		if (typeof content !== 'string') throw new TypeError('content must be a string');
		this.$('main').html(content);
		return this;
	}

	public addHead(head: string): Page {
		if (typeof head !== 'string') throw new TypeError('head must be a string');
		this.$('head').append(head);
		return this;
	}

	public setGithubLink(url: string): Page {
		if (typeof url !== 'string') throw new TypeError('url must be a string');
		this.$('#github-link').remove();
		this.$('footer').append(
			`<div id="github-link"><a target="_blank" href="${url}">Improve this page on GitHub</a></div>`,
		);
		return this;
	}

	public render(): string {
		return this.$.html();
	}
}
