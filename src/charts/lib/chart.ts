
import { Canvas, RectType } from './canvas.ts';
import Color from 'color';

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
	boxHeight?: number;
	gapHeight?: number;
}

export class Chart {
	private readonly canvas: Canvas;
	private readonly id: string;
	private y0: number = 0;
	private readonly layers: Layers;
	private readonly colWidth: number;
	private readonly colStart: number;
	private readonly boxHeight: number;
	private readonly gapHeight: number;

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
		this.boxHeight = opt.boxHeight || 40;
		this.gapHeight = opt.gapHeight || 40;
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

		let group = this.layers.boxes;
		const add = (text: string, colorString: string, highlight: boolean = false, end: boolean = false) => {
			const color = Color(colorString).rgb();

			let width = end
				? this.colStart - this.colWidth / 4 - this.boxHeight / 4
				: this.colWidth / 2;

			let rect: RectType = [x0, y0, width, this.boxHeight];
			group.drawFlowBox(rect, 0.5, {
				strokeWidth: highlight ? '2' : '0',
				stroke: color.string(),
				fill: color.fade(2 / 3).string(),
			});
			rect[0] += this.boxHeight / 3;
			group.drawText(rect, text, { fill: color.string(), fontFamily, fontSize: '16px' });

			x0 += width;
			colIndex++;

			return group;
		}

		return { add };
	}
}
