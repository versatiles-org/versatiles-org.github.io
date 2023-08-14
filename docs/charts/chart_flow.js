
import { Chart } from './lib/chart.js'

export default function (index) {
	const c = new Chart({
		backgroundColor: '#000',
		colWidth: 200,
		colStart: 120,
		boxWidth: 140,
		boxHeight: 40,
		gapHeight: 40,
	});

	const steps = [
		['OSM', false, true],
		['Generator', true],
		['.mbtiles', false],
		['Converter', true],
		['.versatiles', false],
		['Server', true],
		['HTTP', false],
		['Proxy', true],
		['HTTPS', false],
		['Frontend', true],
		['Web', false, true],
	];

	let f = c.addFlow();
	if (typeof index === 'number') {
		f.add(...(steps[index].slice(0, 2)));
	} else {
		steps.forEach(s => f.add(...s));
	}

	return c.asSVG(2);
}
