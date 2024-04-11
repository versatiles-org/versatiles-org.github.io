---
title: VersaTiles
---


<section>
	<style scoped>
		#headblock {
			padding: 2em 0;
			display: flex;
			flex-direction: row;
			flex-flow: row wrap;
			justify-content: center;
			align-items: center;
			gap: 2em;
			font-size: min(1em, 4vw);
		}

		#headblock img {
			display: flex;
		}

		#headline {
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}

		#headline h1 {
			background-clip: text;
			color: #fff;
			font-family: sans-serif;
			font-size: 4em;
			font-weight: 400;
			padding: 0;
			margin: 0;
		}

		#headline p {
			color: #fff5;
			display: flex;
			flex-direction: row;
			font-size: 1em;
			font-weight: 400;
			justify-content: space-between;
			letter-spacing: 0.1em;
			margin: 0.1em 0 0;
			padding: 0;
			text-transform: uppercase;
			width: 100%;
		}

		#headline p span {
			margin: 0;
		}
	</style>
	<div id="headblock">
		<img src="assets/logo/versatiles.svg">
		<div id="headline">
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
</section>
<section>
	<hero>VersaTiles is a completely <a href="https://en.wikipedia.org/wiki/Free_and_open-source_software" title="Free, Libre and Open Source Software">FLOSS</a> stack for generating, distributing and using map tiles based on OpenStreetMap data, free of any commercial interests.</hero>
</section>
<section>
	<h2>Try it out</h2>
	<link rel="stylesheet" type="text/css" href="https://tiles.versatiles.org/assets/maplibre-gl/maplibre-gl.css" />
	<script src="https://tiles.versatiles.org/assets/maplibre-gl/maplibre-gl.js"></script>
	<style scoped>
		#map {
			display: block;
			width: 100%;
			max-width: 640px;
			aspect-ratio: 16 / 9;
			min-height: 240px;
			margin: auto;
			/* -webkit-box-reflect: below 0px -webkit-gradient(linear, left top, left bottom, from(#0000), color-stop(0.5, #0000), to(#0005)); */
		}
	</style>
	<div id="map"></div>
	<script>
		const map = new maplibregl.Map({
			container: 'map',
			style: 'https://tiles.versatiles.org/assets/styles/colorful.json',
			bounds: [13.09, 52.33, 13.74, 52.68],
			maxZoom: 18,
			attributionControl: false,
			cooperativeGestures: true,
		});
		map.addControl(new maplibregl.FullscreenControl());
		map.addControl(new maplibregl.AttributionControl({ compact: true }));
	</script>
</section>
<section>
	<p style="text-align: center">If you want to know more, we explain here:
	<ul style="width: 18rem;">
		<li><a href="guide.html">how to use it</a>,</li>
		<li><a href="overview.html">how it works</a> and</li>
		<li><a href="contribute.html">how you can help.</a></li>
	</ul>
	</p>
</section>
{{> footer }}