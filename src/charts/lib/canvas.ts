import { GlobalStyle } from './style.ts';
import { Group, createElement, setAttributes } from './svg.ts';



const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class Canvas {
	public readonly stylesDefault = new GlobalStyle();
	public readonly stylesDark = new GlobalStyle();
	private idIndex: number = 0;
	public readonly root: Group;

	constructor() {
		this.root = new Group(this);
	}

	getBBox() {
		return this.root.getBBox();
	}

	asSVG(padding = 5): string {
		const { root } = this;
		let svg = createElement('svg');
		let bbox = root.getBBox();
		bbox.addPadding(padding);
		svg.insertAdjacentHTML('afterbegin', [
			'<style>',
			this.stylesDefault.asText(),
			'@media (prefers-color-scheme: dark) {',
			this.stylesDark.asText(),
			'}',
			'</style>'
		].join('\n'));
		svg.append(root.node);

		setAttributes(svg, {
			version: '1.1',
			xmlns: 'http://www.w3.org/2000/svg',
		});
		svg.setAttribute('viewBox', bbox.viewBox);
		return svg.outerHTML;
	}

	getNewId(): string {
		let i = this.idIndex++;
		let id = '';
		do {
			id += chars[i % chars.length];
			i = Math.floor(i / chars.length);
		} while (i > 0)
		return id;
	}
}
