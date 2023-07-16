
EventTarget.prototype.on = function (type, callback) { this.addEventListener(type, callback) }
Array.prototype.isIndexInner = function (index) { return (index > 0) && (index < this.length - 1) }

class BBox {
	constructor(bbox) {
		this.bbox = bbox ? bbox.slice() : [
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY
		]
	}
	get width() {
		return this.bbox[2] - this.bbox[0]
	}
	get height() {
		return this.bbox[3] - this.bbox[1]
	}
	asAttributes() {
		return {
			width: this.width,
			height: this.height,
			viewBox: this.bbox.join(' ')
		}
	}
	includeRect(rect) {
		this.#include([rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]])
	}
	#include(bbox) {
		if (this.bbox[0] > bbox[0]) this.bbox[0] = bbox[0];
		if (this.bbox[1] > bbox[1]) this.bbox[1] = bbox[1];
		if (this.bbox[2] < bbox[2]) this.bbox[2] = bbox[2];
		if (this.bbox[3] < bbox[3]) this.bbox[3] = bbox[3];
	}
	includeBBox(other) {
		this.#include(other.bbox);
	}
	clone() {
		return new BBox(this.bbox);
	}
}

class Canvas {
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
	appendRect(rect, style) {
		let node = this.#appendElement('rect');
		this.#setAttributes(node, { x: rect[0], y: rect[1], width: rect[2], height: rect[3] });
		this.#setStyle(node, style);
		this.bbox.includeRect(rect);
	}
	appendText(rect, text, style) {
		let node = this.#appendElement('text');
		this.#setAttributes(node, { x: rect[0] + rect[2] / 2, y: rect[1] + rect[3] / 2 });
		this.#setStyle(node, style);
		this.#setAttributes(node, { alignmentBaseline: 'middle', textAnchor: 'middle' });
		node.textContent = text;
		this.bbox.includeRect(rect);
	}
	appendFlowBox(rect, style) {
		console.log('fix me');
		let node = this.#appendElement('rect');
		this.#setAttributes(node, { x: rect[0], y: rect[1], width: rect[2], height: rect[3] });
		this.#setStyle(node, style);
		this.bbox.includeRect(rect);
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

const fontFamily = 'sans-serif';
class Chart {
	constructor() {
		this.y0 = 0;
		this.canvas = new Canvas();
	}

	asSVG() {
		return this.canvas.asSVG();
	}

	addHeadline(text) {
		let group = this.canvas.appendGroup();
		let rect = [0, this.y0, 960, 40];
		group.appendRect(rect, { fill: '#FFFA' });
		group.appendText(rect, text, { fontColor: '#000', fontFamily, fontSize: 20 });
		this.y0 += 60;
	}

	addBreak() {
		this.y0 += 60;
	}

	addFlow(elements) {
		let x0 = 0;
		let group = this.canvas.appendGroup();
		elements.forEach((text, i) => {
			let width = elements.isIndexInner(i) ? 100 : 140;
			let color = (i % 2 === 0) ? '#666666' : '#FF1100';
			let rect = [x0, this.y0, width, 40];
			x0 += width;
			group.appendFlowBox(rect, {
				strokeWidth: (i % 2 === 0) ? 0 : 1,
				stroke: color,
				fill: color + '55',
			});
			group.appendText(rect, text, { fill: color, fontFamily, fontSize: 12 });
		})
		this.y0 += 60;
		return group;
	}
}
