/* eslint-disable @typescript-eslint/prefer-destructuring */
import type { BBoxType, PointType, RectType } from './svg.ts';

export class BBox {
	private readonly bbox: BBoxType;

	public constructor(bbox?: BBoxType) {
		if (bbox) {
			this.bbox = bbox.slice() as BBoxType;
		} else {
			this.bbox = [
				Number.POSITIVE_INFINITY,
				Number.POSITIVE_INFINITY,
				Number.NEGATIVE_INFINITY,
				Number.NEGATIVE_INFINITY,
			];
		}
	}

	public get width(): number {
		return this.bbox[2] - this.bbox[0];
	}

	public get height(): number {
		return this.bbox[3] - this.bbox[1];
	}

	public get viewBox(): string {
		return [
			this.bbox[0],
			this.bbox[1],
			this.bbox[2] - this.bbox[0],
			this.bbox[3] - this.bbox[1],
		].join(' ');
	}

	public includeRect(rect: RectType): void {
		this.includeBBox([rect[0], rect[1], rect[0] + rect[2], rect[1] + rect[3]]);
	}

	public includePoint(p: PointType): void {
		this.includeBBox([p[0], p[1], p[0], p[1]]);
	}

	public includeBBox(bbox: BBoxType): void {
		if (this.bbox[0] > bbox[0]) this.bbox[0] = bbox[0];
		if (this.bbox[1] > bbox[1]) this.bbox[1] = bbox[1];
		if (this.bbox[2] < bbox[2]) this.bbox[2] = bbox[2];
		if (this.bbox[3] < bbox[3]) this.bbox[3] = bbox[3];
	}

	public include(other: BBox): void {
		this.includeBBox(other.bbox);
	}

	public clone(): BBox {
		return new BBox(this.bbox);
	}

	public addPadding(padding: number): void {
		this.bbox[0] -= padding;
		this.bbox[1] -= padding;
		this.bbox[2] += padding;
		this.bbox[3] += padding;
	}
}
