
import { Chart } from './lib/chart.js'

export default function (index: number) {
	const c = new Chart({
		colWidth: 200,
		colStart: 120,
		boxHeight: 40,
		gapHeight: 40,
	});

	let steps: { color: string, text: string, highlight: boolean, end?: boolean }[] = [
		{ color: 'hsla(  0, 100%, 50%, 0.5)', text: 'Data', highlight: false, end: true },
		{ color: 'hsla( 10, 100%, 50%, 1.0)', text: 'Generator', highlight: true },
		{ color: 'hsla( 30, 100%, 50%, 0.5)', text: '.versatiles', highlight: false },
		{ color: 'hsla( 50, 100%, 50%, 1.0)', text: 'Server', highlight: true },
		{ color: 'hsla( 80, 100%, 50%, 0.5)', text: 'HTTP', highlight: false },
		{ color: 'hsla(120, 100%, 50%, 1.0)', text: 'Network', highlight: true },
		{ color: 'hsla(150, 100%, 50%, 0.5)', text: 'HTTPS', highlight: false },
		{ color: 'hsla(200, 100%, 50%, 1.0)', text: 'Frontend', highlight: true },
		{ color: 'hsla(230, 100%, 50%, 0.5)', text: 'User', highlight: false, end: true },
	];

	let f = c.addFlow();
	if (typeof index === 'number') steps = [steps[index]]
	steps.forEach(s => f.add(s.text, s.color, s.highlight, s.end));

	return c.asSVG(2);
}
