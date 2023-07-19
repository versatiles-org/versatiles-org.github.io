import { BBox } from "./bbox.js";

export class Canvas {
	constructor() {
		this.node = this.#getElement('g');
		this.bbox = new BBox();
		this.subGroups = [];
	}
	getBBox() {
		let bbox = this.bbox.clone();
		this.subGroups.forEach(g => bbox.includeBBox(g.getBBox()));
		return bbox;
	}
	asSVG() {
		let svg = this.#getElement('svg');
		let bbox = this.getBBox();
		this.#setAttributes(svg, bbox.asAttributes());
		svg.append(this.node);
		return svg;
	}
	appendGroup() {
		let group = new Canvas();
		this.#append(group.node);
		this.subGroups.push(group);
		return group;
	}
	drawRect(rect, style) {
		let node = this.#appendElement('rect');
		this.#setAttributes(node, { x: rect[0], y: rect[1], width: rect[2], height: rect[3] });
		this.#setStyle(node, style);
		this.bbox.includeRect(rect);
	}
	drawCircle(pos, radius, style) {
		let node = this.#appendElement('circle');
		this.#setAttributes(node, { cx: pos[0], cy: pos[1], r: radius });
		this.#setStyle(node, style);
		this.bbox.includeRect([pos[0] - radius, pos[1] - radius, radius * 2, radius * 2]);
	}
	drawText(rect, text, style) {
		let node = this.#appendElement('text');
		this.#setAttributes(node, { x: rect[0] + rect[2] / 2, y: rect[1] + rect[3] / 2 });
		this.#setStyle(node, style);
		this.#setAttributes(node, { alignmentBaseline: 'central', textAnchor: 'middle' });
		node.textContent = text;
		this.bbox.includeRect(rect);
	}
	drawLine(p1, p2, style) {
		let node = this.#appendElement('line');
		this.#setAttributes(node, { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] });
		this.#setStyle(node, style);
		this.bbox.includePoint(p1);
		this.bbox.includePoint(p2);
	}
	drawFlowBox(rect, style) {
		let node = this.#appendElement('path');
		let coords = {
			x: [rect[0], rect[0] + rect[3] / 2, rect[0] + rect[2], rect[0] + rect[2] + rect[3] / 2],
			y: [rect[1], rect[1] + rect[3] / 2, rect[1] + rect[3]]
		}

		let d = 'Mx0,y0Lx1,y1Lx0,y2Lx2,y2Lx3,y1Lx2,y0z'
			.replace(/[xy][0-9]/g, key => coords[key[0]][parseInt(key[1], 10)]);
		this.#setAttributes(node, { d });
		this.#setStyle(node, style);
		this.bbox.includeRect([rect[0], rect[1], rect[2] + rect[3] / 2, rect[3]]);
	}
	drawPath(d, style) {
		let node = this.#appendElement('path');
		this.#setAttributes(node, { d });
		this.#setStyle(node, style);
	}
	drawArrowHead(point, dir, style) {
		let node = this.#appendElement('path');
		let a = 0.4;
		let d1 = [dir[0] - dir[1] * a, dir[1] + dir[0] * a];
		let d2 = [dir[0] + dir[1] * a, dir[1] - dir[0] * a];
		let d = `M${point.join(',')}L${p(i => point[i] + d1[i])}L${p(i => point[i] + d2[i])}z`;

		this.#setAttributes(node, { d });
		this.#setStyle(node, style);

		function p(cb) {
			return [0, 1].map(i => cb(i)).join(',');
		}
	}
	#append(node) {
		this.node.append(node);
		return node;
	}
	#appendElement(tagName) {
		return this.#append(this.#getElement(tagName));
	}
	#getElement(tagName) {
		return document.createElementNS('http://www.w3.org/2000/svg', tagName);
	}
	#setAttributes(node, attributeObj) {
		for (let key in attributeObj) {
			node.setAttribute(
				key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()),
				attributeObj[key]
			);
		}
	}
	#setStyle(node, styleObj) {
		for (let key in styleObj) node.style[key] = styleObj[key];
	}
}
