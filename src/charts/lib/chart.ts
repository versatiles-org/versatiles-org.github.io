
import { Canvas, Group, RectType } from './canvas.ts';
import Color from 'color';

const fontFamily = 'sans-serif';

interface Layers {
	fill: Group;
	line: Group;
	text: Group;
}

interface Options {
	colWidth?: number;
	colStart?: number;
	boxHeight?: number;
	gapHeight?: number;
}

export class Chart {
	private readonly canvas: Canvas;
	private y0: number = 0;
	private readonly layers: Layers;
	private readonly colWidth: number;
	private readonly colStart: number;
	private readonly boxHeight: number;

	constructor(opt: Options = {}) {
		this.canvas = new Canvas();

		const { root } = this.canvas;
		this.layers = {
			fill: root.appendGroup(),
			line: root.appendGroup(),
			text: root.appendGroup(),
		}

		this.colWidth = opt.colWidth || 200;
		this.colStart = opt.colStart || 180;
		this.boxHeight = opt.boxHeight || 40;
	}

	asSVG(padding: number): string {
		return this.canvas.asSVG(padding);
	}

	asImg(padding: number): string {
		const svg = this.canvas.asSVG(padding);
		const style = `width:100%; height:auto; max-width:${this.canvas.getBBox().width}px;`;
		return `<img src="data:image/svg+xml;base64,${btoa(svg)}" style="${style}">`;
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

			this.layers.fill.drawFlowBox(rect, {
				default: { fillOpacity: '0.4' },
				light: { fill: color.string() },
				dark: { fill: color.string() },
			});

			if (highlight) {
				this.layers.line.drawFlowBox(rect, {
					default: { fill: 'none', strokeWidth: '2' },
					light: { stroke: color.string() },
					dark: { stroke: color.string() },
				});
			}

			rect[0] += this.boxHeight / 3;

			this.layers.text.drawText(rect, text, {
				default: { fontFamily, fontSize: '16px', stroke: 'none' },
				light: { fill: color.string() },
				dark: { fill: color.string() },
			});

			x0 += width;
			colIndex++;
		}

		return { add };
	}
}
