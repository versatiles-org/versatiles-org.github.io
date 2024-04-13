import { BBox } from './bbox.ts';
import { JSDOM } from 'jsdom';

export type BBoxType = [number, number, number, number];
export type RectType = [number, number, number, number];
export type PointType = [number, number];

type Style = Partial<CSSStyleDeclaration>;
interface MultiStyle {
	default?: Style,
	light?: Style,
	dark?: Style,
}
interface MultiStylesheet {
	light: Map<string, Style>;
	dark: Map<string, Style>;
}

const { document } = (new JSDOM('')).window;

const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export class Group {
	public readonly node: SVGElement;
	protected readonly bbox: BBox;
	protected readonly subGroups: Group[] = [];
	private readonly canvas: Canvas;

	constructor(canvas: Canvas) {
		this.node = getElement('g');
		this.bbox = new BBox();
		this.canvas = canvas;
	}

	getBBox() {
		let bbox = this.bbox.clone();
		this.subGroups.forEach(g => bbox.include(g.getBBox()));
		return bbox;
	}

	appendGroup() {
		let group = new Group(this.canvas);
		this.#append(group.node);
		this.subGroups.push(group);
		return group;
	}

	drawText(rect: RectType, text: string, style: MultiStyle): SVGElement {
		let node = this.#appendElement('text');
		setAttributes(node, {
			x: Math.round(rect[0] + rect[2] / 2),
			y: Math.round(rect[1] + rect[3] / 2)
		});
		this.setMultiStyle(node, style);
		setAttributes(node, { alignmentBaseline: 'central', textAnchor: 'middle' });
		node.textContent = text;
		this.bbox.includeRect(rect);
		return node;
	}

	drawFlowBox(rect: RectType, style: MultiStyle): SVGElement {
		const strength = 0.5;

		let node = this.#appendElement('path');
		let x0 = rect[0];
		let x1 = rect[0] + rect[3] * strength;
		let x2 = rect[0] + rect[2];
		let x3 = rect[0] + rect[2] + rect[3] * strength;
		let y0 = rect[1];
		let y1 = rect[1] + rect[3] / 2;
		let y2 = rect[1] + rect[3];

		let d = `M${x0},${y0}L${x1},${y1}L${x0},${y2}L${x2},${y2}L${x3},${y1}L${x2},${y0}z`
		setAttributes(node, { d });
		this.setMultiStyle(node, style);
		this.bbox.includeRect([rect[0], rect[1], rect[2] + rect[3] * strength, rect[3]]);
		return node;
	}

	#append(node: SVGElement): SVGElement {
		this.node.append(node);
		return node;
	}

	#appendElement(tagName: string): SVGElement {
		return this.#append(getElement(tagName));
	}

	setMultiStyle(node: SVGElement, style: MultiStyle) {
		if (style.default) setStyle(node, style.default);

		if (!(style.light || style.dark)) return

		if (!node.id) node.id = this.canvas.getNewId();

		if (style.light) updateStyle(this.canvas.styles.light, node.id, style.light);
		if (style.dark) updateStyle(this.canvas.styles.dark, node.id, style.dark);
	}

}

export class Canvas {
	public readonly styles: MultiStylesheet;
	private idIndex: number = 0;
	public readonly root: Group;

	constructor(styles?: MultiStylesheet) {
		this.styles = styles ?? { light: new Map(), dark: new Map() };
		this.root = new Group(this);
	}

	getBBox() {
		return this.root.getBBox();
	}

	asSVG(padding = 5): string {
		const { root } = this;
		let svg = getElement('svg');
		let bbox = root.getBBox();
		bbox.addPadding(padding);
		svg.insertAdjacentHTML('afterbegin', [
			'<style>',
			getStylesAsText(this.styles.light),
			getStylesAsText(this.styles.dark),
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
		return index2id(this.idIndex++);
	}
}

function index2id(i: number): string {
	let id = '';
	do {
		id += chars[i % chars.length];
		i = Math.floor(i / chars.length);
	} while (i > 0)
	return id;
}

function getElement(tagName: string): SVGElement {
	return document.createElementNS('http://www.w3.org/2000/svg', tagName) as SVGElement;
}

function setAttributes(node: SVGElement, attributeObj: Record<string, string | null | number>) {
	for (let key in attributeObj) {
		let name = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
		let value = attributeObj[key];
		if (value == null) {
			node.removeAttribute(name);
		} else {
			node.setAttribute(name, String(value));
		}
	}
}

function setStyle(node: SVGElement, style: Style) {
	for (let key in style) {
		const value = style[key];
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style[key] = value;
		}
	}
}

function updateStyle(map: Map<string, Style>, id: string, style: Style) {
	let item = map.get(id);
	if (item == null) {
		item = JSON.parse(JSON.stringify(style)) as Style;
		map.set(id, item);
	}
	for (let key in style) item[key] = style[key];
}

function getStylesAsText(map: Map<string, Style>): string {
	const styleSheet = new Array<string>();
	for (const [key, style] of map.entries()) {
		const node = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGElement;
		setStyle(node, style);
		styleSheet.push(`#${key} {${node.style.cssText}}`)
	}
	return styleSheet.join('\n');
}
