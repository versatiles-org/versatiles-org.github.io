import type { PageResult } from '../../src/cms/types.ts';

interface SourceEntry {
	coverage: string;
	source: { name: string; url: string };
	license: { name: string; url?: string };
}

const vectorData: SourceEntry[] = [
	{
		coverage: 'Global',
		source: { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/' },
		license: { name: 'ODbL', url: 'https://opendatacommons.org/licenses/odbl/' },
	},
];

const satelliteData: SourceEntry[] = [
	{
		coverage: 'Global',
		source: { name: 'Sentinel-2 Global Mosaic', url: 'https://s2gm.land.copernicus.eu/' },
		license: { name: 'CC-BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
	},
	{
		coverage: 'Global',
		source: { name: 'NASA Blue Marble Next Generation', url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/' },
		license: { name: 'Public Domain' },
	},
];

async function fetchOrthophotos(): Promise<SourceEntry[]> {
	const res = await fetch('https://versatiles.org/orthophotos/sources.json');
	const data = await res.json();
	return data
		.filter((e: { status?: { status?: string; creator?: unknown; license?: unknown } }) =>
			e.status?.status === 'success' && e.status?.creator && e.status?.license
		)
		.map((e: { name: { fullname: string }; status: { creator: { name: string; url: string }; license: { name: string; url: string } } }) => ({
			coverage: e.name.fullname,
			source: { name: e.status.creator.name, url: e.status.creator.url },
			license: { name: e.status.license.name, url: e.status.license.url },
		}))
		.sort((a: SourceEntry, b: SourceEntry) => a.coverage.localeCompare(b.coverage));
}

function renderTable(entries: SourceEntry[]): string {
	const rows = entries.map((e) =>
		`<tr><td>${e.coverage}</td><td><a href="${e.source.url}">${e.source.name}</a></td><td>${e.license.url ? `<a href="${e.license.url}">${e.license.name}</a>` : e.license.name}</td></tr>`
	).join('');

	return `<table>
<thead><tr><th>Coverage</th><th>Data Source</th><th>License</th></tr></thead>
<tbody>${rows}</tbody>
</table>`;
}

const styles = `<style>
.sources-page table {
	display: table;
	width: 100%;
	border-collapse: collapse;
	margin: 1.5rem 0 3rem;
	border: none;
}
.sources-page th,
.sources-page td {
	text-align: left;
	padding: 0.6rem 1rem;
	border-bottom: 1px solid #333;
}
.sources-page th {
	color: #fff;
	font-weight: 600;
	border-bottom: 2px solid #444;
}
.sources-page tr:hover td {
	background: #ffffff08;
}
.sources-page td:first-child {
	white-space: nowrap;
}
.sources-page td:nth-child(3) {
	white-space: nowrap;
}
</style>`;

export default async function (): Promise<PageResult> {
	const html = `${styles}
<div class="sources-page">
<h1>Data Sources</h1>
<h2>Vector Data</h2>
${renderTable(vectorData)}
<h2>Satellite Data</h2>
${renderTable(satelliteData)}
<h2>Orthophotos</h2>
${renderTable(await fetchOrthophotos())}
</div>`;

	return {
		title: 'VersaTiles - Data Sources',
		description: 'Data sources used for VersaTiles map tiles',
		menuEntry: 'Data Sources',
		html,
	};
}
