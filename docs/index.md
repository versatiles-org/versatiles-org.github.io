---
title: VersaTiles
menuEntry: Overview
---

<div id="logoblock">
	<img src="assets/logo/versatiles.svg">
	<div>
		<h1>VersaTiles</h1>
		<p>
			<span>a</span>
			<span>complete</span>
			<span><abbr title="Free, Libre and Open Source Software">FLOSS</abbr></span>
			<span>map</span>
			<span>stack</span>
		</p>
	</div>
</div>

<hero>VersaTiles is a completely [FLOSS](https://en.wikipedia.org/wiki/Free_and_open-source_software "Free, Libre and Open Source Software") stack for generating, distributing, and using map tiles based on OpenStreetMap data, free of any commercial interests.</hero>


## Try it out

<link rel="stylesheet" type="text/css" href="https://tiles.versatiles.org/assets/lib/maplibre-gl/maplibre-gl.css" />
<script src="https://tiles.versatiles.org/assets/lib/maplibre-gl/maplibre-gl.js"></script>
<style scoped>
	#map {
		display: block;
		width: 100%;
		max-width: 640px;
		aspect-ratio: 16 / 9;
		min-height: 240px;
		margin: auto;
	}
</style>
<div id="map"></div>
<script>
	const map = new maplibregl.Map({
		container: 'map',
		style: 'https://tiles.versatiles.org/assets/styles/colorful/style.json',
		bounds: [13.09, 52.33, 13.74, 52.68],
		maxZoom: 18,
		attributionControl: false,
		cooperativeGestures: true,
	});
	map.addControl(new maplibregl.FullscreenControl());
	map.addControl(new maplibregl.AttributionControl({ compact: true }));
</script>

## Powered by

<p style="text-align:center"><a href="https://www.miz-babelsberg.de/foerderung/foerderprojekte-alumni/details/versatiles-editorial-tools.html"><img src="/assets/logo/miz-logo.png" width="281"></a></p>

<small>MIZ-Babelsberg has funded the development of the "VersaTiles Editorial Tools"</small>
