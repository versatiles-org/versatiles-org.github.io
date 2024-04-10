
import { Chart } from './lib/chart.js'

export default function (index: number) {
	const c = new Chart({
		backgroundColor: '#000',
		colWidth: 200,
		colStart: 120,
		boxWidth: 140,
		boxHeight: 40,
		gapHeight: 40,
	});

	let steps: { text: string, highlight: boolean, end?: boolean }[] = [
		{ text: 'OSM', highlight: false, end: true },
		{ text: 'Generator', highlight: true },
		{ text: '.versatiles', highlight: false },
		{ text: 'Server', highlight: true },
		{ text: 'HTTP', highlight: false },
		{ text: 'Network', highlight: true },
		{ text: 'HTTPS', highlight: false },
		{ text: 'Frontend', highlight: true },
		{ text: 'User', highlight: false, end: true },
	];

	let f = c.addFlow();
	if (typeof index === 'number') steps = [steps[index]]
	steps.forEach(s => f.add(s.text, s.highlight, s.end));

	return c.asSVG(2);
}
