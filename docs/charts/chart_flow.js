
import { Chart } from './lib/chart.js'

export default function (a, b) {
	const c = new Chart({
		backgroundColor: '#000',
		colWidth: 200,
		colStart: 180,
		boxWidth: 140,
		boxHeight: 40,
		gapHeight: 40,
	});

	const steps = [
		['OSM data', false, true],
		['1. Generator', true],
		['.mbtiles', false],
		['2. Converter', true],
		['.versatiles', false],
		['3. Server', true],
		['HTTP', false],
		['4. Proxy', true],
		['HTTPS', false],
		['5. Frontend', true],
		['web map', false, true],
	];

	let f = c.addFlow();
	if (typeof a === 'number') {
		f.add(...(steps[a].slice(0, 2)));
	} else {
		steps.forEach(s => f.add(...s));
	}

	return c.asSVG(2);
}
