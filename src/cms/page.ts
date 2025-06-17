import { type CheerioAPI, load } from 'cheerio';

export interface MenuEntry {
	title: string;
	url: string;
}

export class Page {
	private $: CheerioAPI;

	constructor(template: string) {
		if (typeof template !== 'string') throw new TypeError('template must be a string');
		this.$ = load(template);
	}

	static async fromURL(url: string): Promise<Page> {
		if (typeof url !== 'string') throw new TypeError('url must be a string');
		const content = await fetch(url).then((r) => r.text());
		return new Page(content);
	}

	public clone(): Page {
		return new Page(this.render());
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

	public setTitle(title: string, description: string): Page {
		if (typeof title !== 'string') throw new TypeError('title must be a string');
		if (typeof description !== 'string') throw new TypeError('description must be a string');

		this.$('title').text(title);
		this.$('meta[name="og:title"]').attr('content', title);
		this.$('meta[name="twitter:title"]').attr('content', title);

		this.$('meta[name="description"]').attr('content', description);
		this.$('meta[name="og:description"]').attr('content', description);
		this.$('meta[name="twitter:description"]').attr('content', description);

		return this;
	}

	public setContent(content: string): Page {
		if (typeof content !== 'string') throw new TypeError('content must be a string');
		this.$('main').html(content);
		return this;
	}

	public setContentAttributes(attributes: Record<string, string>): Page {
		if (typeof attributes !== 'object' || attributes === null) {
			throw new TypeError('attributes must be an object');
		}
		const mainElement = this.$('main');
		Object.entries(attributes).forEach(([key, value]) => {
			if (typeof key !== 'string' || typeof value !== 'string') return;
			mainElement.attr(key, value);
		});
		return this;
	}

	public setAsMarkdownPage(add: boolean): Page {
		this.$('main').toggleClass('markdown-body', add);
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

	public setBaseUrl(baseUrl: string): Page {
		if (typeof baseUrl !== 'string') throw new TypeError('baseUrl must be a string');

		const upgradeUrl = (attr: string) => {
			this.$(`[${attr}]`).each((_, element) => {
				const url = this.$(element).attr(attr);
				if (url && !url.startsWith('http')) {
					this.$(element).attr(attr, new URL(url, baseUrl).href);
				}
			});
		};

		upgradeUrl('href');
		upgradeUrl('src');

		return this;
	}

	public render(): string {
		this.$('[class=""]').each((_, element) => {
			this.$(element).removeAttr('class');
		});
		this.$('[style=""]').each((_, element) => {
			this.$(element).removeAttr('style');
		});
		return this.$.html();
	}
}
