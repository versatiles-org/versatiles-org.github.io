
export class BBox {
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
	get viewBox() {
		return [
			this.bbox[0],
			this.bbox[1],
			this.bbox[2] - this.bbox[0],
			this.bbox[3] - this.bbox[1],
		].join(' ');
	}
	includeRect(rect) {
		this.#include([rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]])
	}
	includePoint(p) {
		this.#include([p[0], p[1], p[0], p[1]])
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
	addPadding(padding) {
		this.bbox[0] -= padding;
		this.bbox[1] -= padding;
		this.bbox[2] += padding;
		this.bbox[3] += padding;
	}
}
