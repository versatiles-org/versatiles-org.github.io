---
title: Overview
---

## How does VersaTiles work?

There are a lot of excellent FLOSS solutions for generating, processing, serving, and rendering maps. But in the end, you have to combine multiple solutions and build a complete tech stack. That takes a lot of effort.

VersaTiles tackles this by defining a four-step process chain defining how to process OpenStreetMap data and serve it as an interactive web map. It also provides a reference implementation of these four steps, but is flexible enough, so that every step can be replaced by your preferred solution. So if you want e.g., a different tile source, a different server, or a different frontend, you can just replace the relevant part and still use the other steps.

## The 4 steps of VersaTiles

{{{chart_flow}}}

The grey boxes represent data. Red boxes are steps that process the data.
The whole process chain uses OSM data as input and generates a web map as output.

The process chain in more details:

<table class="overview">
<tr><th>{{{chart_flow 0}}}</th><td>

We use the latest OSM dump.
</td></tr>
<tr><th>{{{chart_flow 1}}}</th><td>

_Generator produces vector tiles._ We are using [tilemaker](https://tilemaker.org/) to generate vector tiles in [shortbread schema](https://shortbread-tiles.org/schema/).
</td></tr>
<tr><th>{{{chart_flow 2}}}</th><td>

a [versatiles container](http://github.com/versatiles-org/versatiles-spec), a much more simpler and efficient tile storage format, than .mbtiles.
</td></tr>
<tr><th>{{{chart_flow 3}}}</th><td>

_Server is serving the vector tiles._
</td></tr>
<tr><th>{{{chart_flow 4}}}</th><td>

… but only speaks HTTP, because …
</td></tr>
<tr><th>{{{chart_flow 5}}}</th><td>

_The Network handles network stuff._ like TLS certificates, caching, load balancing etc.
</td></tr>
<tr><th>{{{chart_flow 6}}}</th><td>

Now we serve tiles to the internet …
</td></tr>
<tr><th>{{{chart_flow 7}}}</th><td>

_Frontend loads and renders the vector tiles._
</td></tr>
<tr><th>{{{chart_flow 8}}}</th><td>

Enjoy.
</td></tr>
</table>

We combined permissively licensed open source software, data, schema and styles, such as [tilemaker](https://tilemaker.org/), [Shortbread Tiles Schema](https://shortbread-tiles.org/schema/) and [MapLibre](https://maplibre.org/).

VersaTiles lets you use OpenStreetMap based vector tiles, without any restrictions, locked-in paid services or attribution requirements beyond OpenStreetMap. You can use the [freely downloadable tilesets from VersaTiles](https://download.versatiles.org) on your own infrastructure, in any way you like. Our open spec, royalty free and permissively licensed server implementations work with virtually any server architecture — with no requirement to pay unreasonable prices for "Tiles-as-a-Service".

## What tools do you provide?

### VersaTiles Generator

The repository [versatiles-generator](https://github.com/versatiles-org/versatiles-generator) contains scripts to generate tiles as VersaTiles container. It uses a prepared [Docker image "versatiles-tilemaker"](https://github.com/versatiles-org/versatiles-docker). We use the Generator on a regular basis to generate tiles and upload them to [download.versatiles.org](https://download.versatiles.org).

### Shortbread Tilemaker

The repository [shortbread-tilemaker](https://github.com/versatiles-org/shortbread-tilemaker) contains configuration files and scripts to configure Tilemaker to generate vector tiles in [Shortbread schema](https://shortbread-tiles.org/).

- [node-versatiles-container](https://github.com/versatiles-org/node-versatiles-container)
- [node-versatiles-google-cloud](https://github.com/versatiles-org/node-versatiles-google-cloud)
- [node-versatiles-server](https://github.com/versatiles-org/node-versatiles-server)
- [versatiles-rs](https://github.com/versatiles-org/versatiles-rs)
- [versatiles-docker](https://github.com/versatiles-org/versatiles-docker)
- [maplibre-versatiles-styler](https://github.com/versatiles-org/maplibre-versatiles-styler)
- [versatiles-style](https://github.com/versatiles-org/versatiles-style)
- [versatiles-fonts](https://github.com/versatiles-org/versatiles-fonts)
- [versatiles-frontend](https://github.com/versatiles-org/versatiles-frontend)
- [versatiles-renderer](https://github.com/versatiles-org/versatiles-renderer)
- [versatiles-documentation](https://github.com/versatiles-org/versatiles-documentation)
