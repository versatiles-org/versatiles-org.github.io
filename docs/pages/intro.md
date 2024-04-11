---
title: How to Use
---

# How to use VersaTiles?

There are multiple ways to use VersaTiles:

## Use our map server

Just copy & paste the following code into your website.

```html
<!-- add MapLibre JavaScript and CSS -->
<script src="https://tiles.versatiles.org/assets/maplibre-gl/maplibre-gl.js"></script>
<link href="https://tiles.versatiles.org/assets/maplibre-gl/maplibre-gl.css" rel="stylesheet" />

<!-- add container for the map -->
<div id="map" style="width:90%;aspect-ratio:16/9;margin:auto"></div>

<!-- start map -->
<script>
  new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.versatiles.org/assets/styles/colorful.json'
  }).addControl(new maplibregl.NavigationControl());
</script>
```

[Try it at JSFiddle](https://jsfiddle.net/2hLenq3b/)

**Pros:** simple and free  
**Cons:** we can't guarantee 24/7 availability, yet

If you want to learn more about the MapLibre framework, take a look at their [documentation](https://maplibre.org/maplibre-gl-js/docs/) and their [examples](https://maplibre.org/maplibre-gl-js/docs/examples/) of how to add [markers](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-marker/), [popups](https://maplibre.org/maplibre-gl-js/docs/examples/set-popup/) or [GeoJSON](https://maplibre.org/maplibre-gl-js/docs/examples/geojson-polygon/).

## Use a CDN in front of our map server

Commercial providers prohibit the caching of map tiles to ensure that you always have to pay for the full traffic. However, our map tiles are free and not subject to any additional conditions (except attribution to OSM contributors).
We even encourage you to cache tiles with your own CDN. This takes the load off our servers and improves the performance and stability of your map applications.

Use a CDN like:

- [bunny.net](https://bunny.net/)
- Akamai
- Cloudflare CDN
- Google Cloud CDN
- Amazon Cloudfront
- Fastly
- …

**Pros:** relatively simple, greatly improves availability and performance  
**Cons:** Costs money

Please help us to improve the [documentation](https://github.com/versatiles-org/versatiles-documentation).

## Run your own server

You can [download](https://download.versatiles.org/) the latest planet and serve it using your own server. We are still testing this approach and working on a [documentation](https://github.com/versatiles-org/versatiles-documentation). But you can already use our [Rust server](https://github.com/versatiles-org/versatiles-rs), a [Node.js implementation](https://github.com/versatiles-org/node-versatiles) or one of the [Docker containers](https://github.com/versatiles-org/versatiles-docker).

## Run your own cloud service

You can [download](https://download.versatiles.org/) the latest planet and serve it using your own cloud service on Google Cloud, AWS, Microsoft Azure, DigitalOcean, …

We are still testing this approach and working on a [documentation](https://github.com/versatiles-org/versatiles-documentation).

<script>
  if (navigator.clipboard) {
    document.querySelectorAll('code').forEach(block => {
      let button = document.createElement('button');
      button.innerText = 'Copy Code';
      block.insertAdjacentElement('afterend', button);
      button.addEventListener('click', () => navigator.clipboard.writeText(block.innerText));
    });
  }
</script>
