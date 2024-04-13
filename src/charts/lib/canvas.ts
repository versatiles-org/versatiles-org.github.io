import { BBox } from './bbox.ts';
import { JSDOM } from 'jsdom';

export type BBoxType = [number, number, number, number];
export type RectType = [number, number, number, number];
export type PointType = [number, number];

type Style = Partial<CSSStyleDeclaration>;
export type MultiColor = string | [string, string];
interface MultiStyle {
	fontFamily?: string;
	fontSize?: string;
	strokeWidth?: string;
	stroke?: MultiColor;
	fill?: MultiColor;
	fillOpacity?: string;
	dominantBaseline?: string;
	textAnchor?: string;
}
interface MultiStylesheet {
	light: GlobalStyle;
	dark: GlobalStyle;
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
		this.setMultiStyle(node, { dominantBaseline: 'central', textAnchor: 'middle', ...style });
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
		let key: keyof MultiStyle;
		for (key in style) {
			const value = style[key];
			if (value == null) {
				node.style.removeProperty(key);
			} else {
				if (Array.isArray(value)) {
					if (!node.id) node.id = this.canvas.getNewId();
					this.canvas.styles.light.set(node.id, key, value[0]);
					this.canvas.styles.dark.set(node.id, key, value[1]);
				} else {
					node.style[key] = String(value);
				}
			}
		}
	}

}

class GlobalStyle {
	private readonly lookup = new Map<string, Style>()

	asText(): string {
		const styleSheet = new Array<string>();
		for (const [key, style] of this.lookup.entries()) {
			const node = document.createElementNS('http://www.w3.org/2000/svg', 'g') as SVGElement;

			for (let key in style) {
				const value = style[key];
				if (value == null) {
					node.style.removeProperty(key);
				} else {
					node.style[key] = value;
				}
			}

			styleSheet.push(`#${key} {${node.style.cssText}}`)
		}
		return styleSheet.join('\n');
	}

	set(nodeId: string, key: keyof MultiStyle, value: string) {
		let item = this.lookup.get(nodeId);
		if (item == null) {
			this.lookup.set(nodeId, { [key]: value });
		} else {
			item[key] = value;
		}
	}
}

export class Canvas {
	public readonly styles: MultiStylesheet;
	private idIndex: number = 0;
	public readonly root: Group;

	constructor() {
		this.styles = { light: new GlobalStyle(), dark: new GlobalStyle() };
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
			this.styles.light.asText(),
			'@media (prefers-color-scheme: dark) {',
			this.styles.dark.asText(),
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
