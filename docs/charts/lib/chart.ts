
import { Canvas, PointType, RectType } from "./canvas.js";
import { Color } from "./color.js";
import { Vec } from "./vec.js";

const fontFamily = 'sans-serif';

interface Layers {
	background: Canvas;
	linesBack: Canvas;
	boxes: Canvas;
	linesFront: Canvas;
	headlines: Canvas;
	highlights: Canvas;
}

interface Options {
	colWidth?: number;
	colStart?: number;
	boxWidth?: number;
	boxHeight?: number;
	gapHeight?: number;
	backgroundColor?: string;
}

export class Chart {
	private readonly canvas: Canvas;
	private readonly id: string;
	private y0: number = 0;
	private flowYMax: number = 0;
	private readonly layers: Layers;
	private readonly colWidth: number;
	private readonly colStart: number;
	private readonly boxWidth: number;
	private readonly boxHeight: number;
	private readonly gapHeight: number;
	private readonly backgroundColor: Color;

	constructor(opt: Options = {}) {
		this.canvas = new Canvas();
		this.id = 'svg' + Math.random().toString(36).slice(2);

		this.layers = {
			background: this.canvas.appendGroup(),
			linesBack: this.canvas.appendGroup(),
			boxes: this.canvas.appendGroup(),
			linesFront: this.canvas.appendGroup(),
			headlines: this.canvas.appendGroup(),
			highlights: this.canvas.appendGroup(),
		}

		this.colWidth = opt.colWidth || 200;
		this.colStart = opt.colStart || 180;
		this.boxWidth = opt.boxWidth || 140;
		this.boxHeight = opt.boxHeight || 40;
		this.gapHeight = opt.gapHeight || 40;
		this.backgroundColor = new Color(opt.backgroundColor || '#000');
	}

	asSVG(padding: number): string {
		return this.canvas.asSVG(padding, this.id);
	}

	addHeadline(text: string): void {
		this.addBreak(2);

		let group = this.layers.headlines;
		let rect: RectType = [
			this.colStart - this.colWidth / 4 - this.boxHeight / 4, this.y0,
			this.colWidth * 4.5 + this.boxHeight / 2, this.boxHeight
		];
		group.drawRect(rect, { fill: '#FFFA' });
		group.drawText(rect, text, { color: '#000', fontFamily, fontSize: this.boxHeight / 2 + 'px' });
		this.y0 += this.boxHeight;

		this.addBreak();
	}

	addBreak(count = 1) {
		this.y0 += this.gapHeight * count;
	}

	addFlow() {
		let x0 = 0, y0 = this.y0, colIndex = 0;

		this.y0 += this.boxHeight;
		this.flowYMax = this.y0;

		let group = this.layers.boxes;
		const add = (text: string, highlight: boolean = false, end: boolean = false) => {
			let width = end
				? this.colStart - this.colWidth / 4 - this.boxHeight / 4
				: this.colWidth / 2;

			highlight ??= (colIndex % 2 === 1);

			let color = highlight ? '#F10' : '#666';
			let rect: RectType = [x0, y0, width, this.boxHeight];
			group.drawFlowBox(rect, {
				strokeWidth: highlight ? '1' : '0',
				stroke: color,
				fill: color + '5',
			});
			rect[0] += this.boxHeight / 3;
			group.drawText(rect, text, { fill: color, fontFamily, fontSize: '13px' });

			x0 += width;
			colIndex++;

			return group;
		}

		return { add };
	}
}
