
type Args = [string];

export class Color {
	private values: [number, number, number, number] = [0, 0, 0, 0];

	constructor(...args: Args) {
		this.set(...args);
	}
	set(...args: Args): Color {
		if (typeof args[0] === 'string') return this.setFromString(args[0]);
		throw Error();
	}
	setFromString(text: string): Color {
		if (text[0] === '#') {
			if (text.length === 4) {
				return this.setFromValues(
					parseInt(text[1], 16) * 17,
					parseInt(text[2], 16) * 17,
					parseInt(text[3], 16) * 17,
					255);
			}
		}
		throw Error();
	}
	setFromValues(r: number, g: number, b: number, a: number): Color {
		this.values = [r, g, b, a]
		return this;
	}
	fadeTo(color: Color, strength: number): Color {
		this.values = [
			this.values[0] * (1 - strength) + color.values[0] * strength,
			this.values[1] * (1 - strength) + color.values[1] * strength,
			this.values[2] * (1 - strength) + color.values[2] * strength,
			this.values[3] * (1 - strength) + color.values[3] * strength,
		]
		return this;
	}
	toString() {
		return '#' + this.values.map(v => {
			v = Math.min(255, Math.max(0, Math.round(v)));
			let s = v.toString(16);
			while (s.length < 2) s = '0' + v;
			return s;
		}).join('')
	}
}
