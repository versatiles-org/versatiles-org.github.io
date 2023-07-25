
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

	c.addHeadline('How does VersaTiles process OpenStreetMap data to create an interactive web map?');

	c.addFlow()
		.add('OSM data', null, true)
		.add('1. Generator')
		.add('.mbtiles')
		.add('2. Converter')
		.add('.versatiles')
		.add('3. Server')
		.add('HTTP')
		.add('4. Proxy')
		.add('HTTPS')
		.add('5. Frontend')
		.add('web map', null, true);

	c.addHeadline('Which containers, packages or files can cover which part of this process chain?');

	let covDocM = c.addCover('docker', 'versatiles-maker', [0, 1, 2]);
	let covRust = c.addCover('rust', 'versatiles-rs', [1, 2]);
	let covNode = c.addCover('node', 'node-versatiles', [2]);
	let covDoc0 = c.addCover('docker', 'versatiles', [1, 2]);
	let covDocS = c.addCover('docker', 'versatiles-server', [1, 2, 3, 4], 2);
	let covFFro = c.addCover('file', 'frontend.tar', [4], 3);

	c.addCoverGuides();



	c.addHeadline('How do containers, packages or files build on each other?');

	let depDoc0 = c.addDependency('docker', 'versatiles', 1, covDoc0);

	let depDocM = c.addDependency('docker', 'versatiles-maker', 0, covDocM);
	c.addDepDep(depDoc0, depDocM);

	let depDocS = c.addDependency('docker', 'versatiles-server', 2, covDocS);
	c.addDepDep(depDoc0, depDocS);

	let depRust = c.addDependency('rust', 'versatiles-rs', 1, covRust, { startDir: 'W', endDir: 'W', dy: 20, endContactShift: 10 });
	c.addDepDep(depRust, depDoc0);

	let depNode = c.addDependency('node', 'node-versatiles', 2, covNode, { startDir: 'E', endDir: 'E', dy: 20 });

	let depFFro = c.addDependency('file', 'frontend.tar', 3, covFFro);
	c.addDepDep(depFFro, depDocS);

	let depFSty = c.addDependency('file', 'styles.tar', 3);
	c.addDepDep(depFSty, depFFro, { startDir: 'E', endDir: 'E', offset: 25 });

	let depFSpr = c.addDependency('file', 'sprites.tar', 3);
	c.addDepDep(depFSpr, depFFro, { startDir: 'E', endDir: 'E', offset: 25 });

	let depFFon = c.addDependency('file', 'fonts.tar', 3);
	c.addDepDep(depFFon, depFFro, { startDir: 'E', endDir: 'E', offset: 25 });



	c.addHeadline('Which repositories produce which containers, packages or files?');

	let repDoc0 = c.addRepo('versatiles-docker', 0)
		.addLink(depDocM, { endOffset: 20 })
		.addLink(depDoc0, { endOffset: 20, endContactShift: - 20 })
		.addLink(depDocS, { endOffset: 20, startDir: 'N', endDir: 'S' });
	let repTile = c.addRepo('shortbread-tilemaker', 0).addLink(repDoc0, { endArrow: true });
	let repVWeb = c.addRepo('versatiles-website', 0);
	let repVDoc = c.addRepo('versatiles-docs', 0);

	let repRust = c.addRepo('versatiles-rs', 1).addLink(depRust);
	let repNode = c.addRepo('node-versatiles', 2).addLink(depNode);

	let repVSpe = c.addRepo('versatiles-spec', 1)
		.addLink(repRust)
		.addLink(repNode, { endDir: 'S' });

	let repFFon = c.addRepo('versatiles-fonts', 3).addLink(depFFon, { startDir: 'W', endDir: 'W', offset: 15 });
	let repFSpr = c.addRepo('versatiles-sprites', 3).addLink(depFSpr, { startDir: 'W', endDir: 'W', offset: 20 });
	let repFSty = c.addRepo('versatiles-styles', 3).addLink(depFSty, { startDir: 'W', endDir: 'W', offset: 25 });
	let repFFro = c.addRepo('versatiles-frontend', 3).addLink(depFFro, { startDir: 'W', endDir: 'W', offset: 30, endContactShift: 10 });

	c.addHover([covDocM, depDocM], [depDoc0, repDoc0, repTile]);
	c.addHover([covDocS, depDocS], [depDoc0, repDoc0]);
	c.addHover([covDoc0, depDoc0], [depDocM, depDocS, depRust, repDoc0]);

	c.addHover([covRust, depRust, repRust], [depDoc0]);
	c.addHover([covNode, depNode, repNode]);

	c.addHover([covFFro, depFFro], [depDocS, depFSty, depFSpr, depFFon, repFFro]);
	c.addHover([depFSty, repFSty], [depFFon]);
	c.addHover([depFSpr, repFSpr], [depFFon]);
	c.addHover([depFFon, repFFon], [depFFon]);

	c.addHover([repDoc0], [repTile, depDocM, depDoc0, depDocS]);
	c.addHover([repTile], [repDoc0, depDocM]);
	c.addHover([repVWeb]);
	c.addHover([repVDoc]);

	c.addHover([repVSpe], [repRust, repNode]);

	return c.asSVG();
}
