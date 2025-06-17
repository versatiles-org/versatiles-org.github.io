---
title: VersaTiles
description: A completely FLOSS map stack.
menuEntry: Overview
---

<div id="logoblock">
	<img src="assets/logo/versatiles.svg" style="background-color: transparent;">
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

<hero>VersaTiles is a completely [FLOSS](https://en.wikipedia.org/wiki/Free_and_open-source_software) stack for generating, distributing, and using map tiles based on OpenStreetMap data, free of any commercial interests.</hero>

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

## Interested?

Read our small [introduction into VersaTiles](https://docs.versatiles.org/basics/versatiles.html) and dig deeper into the [documentation](https://docs.versatiles.org).

Play with some frontend code examples in the [playground](https://versatiles.org/playground/).

Try our [tools](https://versatiles.org/tools/), like our [installation tool](https://versatiles.org/tools/setup_server).

Have a look at our [download server](https://download.versatiles.org/) and the free data we provide.

Join us on [GitHub](https://github.com/versatiles-org) and follow us on [Mastodon](https://mastodon.social/@VersaTiles) or [Bluesky](https://bsky.app/profile/versatiles.bsky.social).

## Powered by

<p style="text-align:center; margin:3rem 0">
<a href="https://nlnet.nl/project/VersaTiles/"><img src="/assets/logo/nlnet-white.svg" width="139" height="52" style="background-color: transparent;margin-right:30px"></a>
<a href="https://nlnet.nl/project/VersaTiles/"><img src="/assets/logo/ngi0core-white.svg" width="166" height="52" style="background-color: transparent;"></a>
<br><small>Funded by European Commission's Next Generation Internet programme<br>through the NGI0 Commons Fund by NLnet.</small>
</p>

<p style="text-align:center; margin:3rem 0"><a href="https://www.miz-babelsberg.de/foerderung/foerderprojekte-alumni/details/versatiles-editorial-tools.html"><img src="/assets/logo/miz.png" width="294" height="36" style="background-color: transparent;"></a><br><small>MIZ-Babelsberg has funded the development of the "VersaTiles Editorial Tools"</small>
</p>
