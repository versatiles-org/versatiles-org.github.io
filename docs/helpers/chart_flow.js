
import { Chart } from './lib/chart.js'

export default function () {
	let c = new Chart({
		backgroundColor: '#000',
		colWidth: 200,
		colStart: 180,
		boxWidth: 140,
		boxHeight: 40,
		gapHeight: 40,
	});

	c.addFlow([
		'OSM data',
		'1. Generator',
		'.mbtiles',
		'2. Converter',
		'.versatiles',
		'3. Server',
		'HTTP',
		'4. Proxy',
		'HTTPS',
		'5. Frontend',
		'web map',
	])

	return c.asSVG();
}
