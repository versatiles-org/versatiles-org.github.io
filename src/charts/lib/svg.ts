import { BBox } from './bbox.ts';
import { JSDOM } from 'jsdom';
import { Canvas } from './canvas.ts';
import { MultiStyle } from './style.ts';

const { document } = (new JSDOM('')).window;


export type BBoxType = [number, number, number, number];
export type RectType = [number, number, number, number];
export type PointType = [number, number];

export class Group {
	public readonly node: SVGElement;
	protected readonly bbox: BBox;
	protected readonly subGroups: Group[] = [];
	private readonly canvas: Canvas;

	constructor(canvas: Canvas) {
		this.node = createElement('g');
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
		return this.#append(createElement(tagName));
	}

	setMultiStyle(node: SVGElement, style: MultiStyle) {
		if (!node.id) node.id = this.canvas.getNewId();

		let key: keyof MultiStyle;
		for (key in style) {
			const value = style[key];
			if (value == null) {
				this.canvas.stylesDefault.set(node.id, key);
				this.canvas.stylesDark.set(node.id, key);
			} else {
				if (Array.isArray(value)) {
					this.canvas.stylesDefault.set(node.id, key, value[0]);
					this.canvas.stylesDark.set(node.id, key, value[1]);
				} else {
					this.canvas.stylesDefault.set(node.id, key, value);
					this.canvas.stylesDark.set(node.id, key);
				}
			}
		}
	}
}

export function createElement(tagName: string): SVGElement {
	return document.createElementNS('http://www.w3.org/2000/svg', tagName) as SVGElement;
}

export function setAttributes(node: SVGElement, attributeObj: Record<string, string | null | number>) {
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
