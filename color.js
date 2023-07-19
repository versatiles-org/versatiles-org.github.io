
export class Color {
	constructor(...args) {
		this.set(...args);
	}
	set(...args) {
		if (typeof args[0] === 'string') return this.setFromString(args[0]);
		throw Error();
	}
	setFromString(text) {
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
	setFromValues(r, g, b, a) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
		return this;
	}
	fadeTo(color, strength) {
		this.r = this.r * (1 - strength) + color.r * strength;
		this.g = this.g * (1 - strength) + color.g * strength;
		this.b = this.b * (1 - strength) + color.b * strength;
		this.a = this.a * (1 - strength) + color.a * strength;
		return this;
	}
	toString() {
		return '#' + [
			this.r, this.g, this.b, this.a
		].map(v => {
			v = Math.min(255, Math.max(0, Math.round(v)));
			v = v.toString(16);
			while (v.length < 2) v = '0' + v;
			return v;
		}).join('')
	}
}
