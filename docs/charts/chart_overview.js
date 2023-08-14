
import { Chart } from './lib/chart.js'

export default function () {
	let c = new Chart({
		backgroundColor: '#000',
		colWidth: 200,
		colStart: 120,
		boxWidth: 140,
		boxHeight: 40,
		gapHeight: 40,
	});

	c.addHeadline('How does VersaTiles process OpenStreetMap data to create an interactive web map?');

	c.addFlow()
		.add('OSM', null, true)
		.add('Generator')
		.add('.mbtiles')
		.add('Converter')
		.add('.versatiles')
		.add('Server')
		.add('HTTP')
		.add('Proxy')
		.add('HTTPS')
		.add('Frontend')
		.add('Web', null, true);

	c.addHeadline('Which containers, packages or files can cover which part of this process chain?');

	let covDocT = c.addCover('docker', 'versatiles-tilemaker', [0, 1, 2]);
	let covRust = c.addCover('rust', 'versatiles-rs', [1, 2]);
	let covNode = c.addCover('node', 'node-versatiles', [2]);
	let covDoc0 = c.addCover('docker', 'versatiles', [1, 2]);
	let covDocN = c.addCover('docker', 'versatiles-nginx', [2, 3, 4], 2);
	let covDocF = c.addCover('docker', 'versatiles-frontend', [2, 4], 3);
	let covFFro = c.addCover('file', 'frontend.tar', [4], 3);

	c.addCoverGuides();



	c.addHeadline('How do containers, packages or files build on each other?');

	let depDocT = c.addDependency('docker', 'versatiles-tilemaker', 0, { dy: 60 })
		.linkCov(covDocT);

	let depDocN = c.addDependency('docker', 'versatiles-nginx', 2)
		.linkCov(covDocN)

	let depDocF = c.addDependency('docker', 'versatiles-frontend', 2)
		.linkCov(covDocF, { dir0: 'E', dir1: 'W', contactShift0: 10, contactShift1: 10, offset: 15, points: ['x1,yc,0,-1'] })
		.linkDep(depDocN);

	let depDoc0 = c.addDependency('docker', 'versatiles', 1, { dy: 60 })
		.linkCov(covDoc0)
		.linkDep(depDocT)
		.linkDep(depDocF);

	let depRust = c.addDependency('rust', 'versatiles-rs', 1, { dy: 20 })
		.linkCov(covRust, { dir0: 'W', dir1: 'W', contactShift1: 10, offset: 15 })
		.linkDep(depDoc0);

	let depNode = c.addDependency('node', 'node-versatiles', 2, { dy: 20 })
		.linkCov(covNode, { dir0: 'W', dir1: 'W', offset: 15 })

	let depFFro = c.addDependency('file', 'frontend.tar', 3, { dy: 60 })
		.linkCov(covFFro)
		.linkDep(depDocF)
		.linkDep(depDocN);

	let depFSty = c.addDependency('file', 'styles.tar', 3)
		.linkDep(depFFro, { dir0: 'E', dir1: 'E', offset: 25 });

	let depFSpr = c.addDependency('file', 'sprites.tar', 3)
		.linkDep(depFFro, { dir0: 'E', dir1: 'E', offset: 25 });

	let depFFon = c.addDependency('file', 'fonts.tar', 3)
		.linkDep(depFFro, { dir0: 'E', dir1: 'E', offset: 25 });



	c.addHeadline('Which repositories produce which containers, packages or files?');

	let repDoc0 = c.addRepo('versatiles-docker', 0)
		.link(depDocT, { dir0: 'N', dir1: 'S' })
		.link(depDoc0, { dir0: 'N', dir1: 'S', points: ['x0+10,y1+0,1,0'], contactShift1: -20 })
		.link(depDocF, { dir0: 'N', dir1: 'S', points: ['x0+10,y1+0,1,0'] })
		.link(depDocN, { dir0: 'N', dir1: 'W', points: ['x1-10,y1+100,1,0'] });

	let repTile = c.addRepo('shortbread-tilemaker', 0).link(repDoc0, { endArrow: true });

	let repRust = c.addRepo('versatiles-rs', 1).link(depRust);
	let repNode = c.addRepo('node-versatiles', 2).link(depNode);

	let repVSpe = c.addRepo('versatiles-spec', 1)
		.link(repRust)
		.link(repNode, { dir1: 'S' })

	let repFFon = c.addRepo('versatiles-fonts', 3).link(depFFon, { dir0: 'W', dir1: 'W', offset: 15 });
	let repFSpr = c.addRepo('versatiles-sprites', 3).link(depFSpr, { dir0: 'W', dir1: 'W', offset: 20 });
	let repFSty = c.addRepo('versatiles-styles', 3).link(depFSty, { dir0: 'W', dir1: 'W', offset: 25 });
	let repFFro = c.addRepo('versatiles-frontend', 3).link(depFFro, { dir0: 'W', dir1: 'W', offset: 30, contactShift1: 10 });

	let repVWeb = c.addRepo('versatiles-website', 0, { dy: 60 });
	let repVDoc = c.addRepo('versatiles-docs', 1, { dy: 60 });


	c.addHover([covDocT, depDocT], [depDoc0, repDoc0, repTile]);
	c.addHover([covDocN, depDocN], [depDocF, depFFro, repDoc0]);
	c.addHover([covDocF, depDocF], [depDoc0, depFFro, repDoc0, depDocN]);
	c.addHover([covDoc0, depDoc0], [depDoc0, depRust, repDoc0]);

	c.addHover([covRust, depRust, repRust], [depDoc0]);
	c.addHover([covNode, depNode, repNode]);

	c.addHover([covFFro, depFFro, repFFro], [depDocF, depDocN, depFSty, depFSpr, depFFon]);
	c.addHover([depFSty, repFSty], [depFFro]);
	c.addHover([depFSpr, repFSpr], [depFFro]);
	c.addHover([depFFon, repFFon], [depFFro]);

	c.addHover([repDoc0], [repTile, depDocT, depDoc0, depDocN]);
	c.addHover([repTile], [repDoc0, depDocT]);
	c.addHover([repVWeb]);
	c.addHover([repVDoc]);

	c.addHover([repVSpe], [repRust, repNode]);

	return c.asSVG();
}
