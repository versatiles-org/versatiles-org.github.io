
import { Canvas, RectType } from './canvas.ts';
import Color from 'color';

const fontFamily = 'sans-serif';

interface Layers {
	fill: Canvas;
	line: Canvas;
	text: Canvas;
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

	constructor(opt: Options = {}) {
		this.canvas = new Canvas();
		this.id = 'svg' + Math.random().toString(36).slice(2);

		this.layers = {
			fill: this.canvas.appendGroup(),
			line: this.canvas.appendGroup(),
			text: this.canvas.appendGroup(),
		}

		this.colWidth = opt.colWidth || 200;
		this.colStart = opt.colStart || 180;
		this.boxHeight = opt.boxHeight || 40;
	}

	asSVG(padding: number): string {
		return this.canvas.asSVG(padding, this.id);
	}

	addFlow() {
		let x0 = 0, y0 = this.y0, colIndex = 0;

		this.y0 += this.boxHeight;

		const add = (text: string, colorString: string, highlight: boolean = false, end: boolean = false) => {
			const color = Color(colorString).rgb();

			let width = end
				? this.colStart - this.colWidth / 4 - this.boxHeight / 4
				: this.colWidth / 2;

			let rect: RectType = [x0, y0, width, this.boxHeight];
			this.layers.fill.drawFlowBox(rect,{
				fill: color.fade(2 / 3).string(),
			});
			this.layers.line.drawFlowBox(rect,{
				fill: 'none',
				strokeWidth: highlight ? '2' : '0',
				stroke: color.string(),
			});
			rect[0] += this.boxHeight / 3;
			this.layers.text.drawText(rect, text, {
				fill: color.string(),
				fontFamily, fontSize: '16px'
			});

			x0 += width;
			colIndex++;
		}

		return { add };
	}
}
