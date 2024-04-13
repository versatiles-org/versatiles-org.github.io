
type Args = [string];

export class Color {
	private values: [number, number, number, number] = [0, 0, 0, 0];

	public constructor(...args: Args) {
		this.set(...args);
	}

	public set(...args: Args): this {
		if (typeof args[0] === 'string') return this.setFromString(args[0]);
		throw Error();
	}

	public setFromString(text: string): this {
		if (text.startsWith('#')) {
			if (text.length === 4) {
				return this.setFromValues([
					parseInt(text[1], 16) * 17,
					parseInt(text[2], 16) * 17,
					parseInt(text[3], 16) * 17,
					255,
				]);
			}
		}
		throw Error();
	}

	public setFromValues(values: [number, number, number, number]): this {
		this.values = values;
		return this;
	}

	public fadeTo(color: Color, strength: number): this {
		this.values = [
			this.values[0] * (1 - strength) + color.values[0] * strength,
			this.values[1] * (1 - strength) + color.values[1] * strength,
			this.values[2] * (1 - strength) + color.values[2] * strength,
			this.values[3] * (1 - strength) + color.values[3] * strength,
		];
		return this;
	}

	public toString(): string {
		return '#' + this.values.map(v => {
			v = Math.min(255, Math.max(0, Math.round(v)));
			let s = v.toString(16);
			while (s.length < 2) s = '0' + v;
			return s;
		}).join('');
	}
}
