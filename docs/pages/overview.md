---
title: Overview
---


## How does VersaTiles work?

There are many excellent FLOSS solutions for generating, processing, serving, and rendering maps. But in the end, you have to combine several solutions and build a complete tech stack. That takes a lot of effort.

VersaTiles tackles this problem by defining a four-step process chain that defines how to process OpenStreetMap data and serve it as an interactive web map. It also provides a reference implementation of these four steps, but is flexible enough so that any step can be replaced by your preferred solution. For exanple, if you want to use a different tile source, server or frontend, you can simply replace the relevant part and still use the other steps.


## The 4 steps of VersaTiles

{{{chart_flow}}}

The grey boxes represent data. The red boxes are steps that process the data.
The whole process chain takes OSM data as input and produces a web map as output.

The process chain in more details:

<table class="overview">
<tr><th>{{{chart_flow 0}}}</th><td>

We use the latest OSM dump.
</td></tr>
<tr><th>{{{chart_flow 1}}}</th><td>

_Generator produces vector tiles._ We use [Tilemaker](https://tilemaker.org/) to generate vector tiles in [shortbread schema](https://shortbread-tiles.org/schema/).
</td></tr>
<tr><th>{{{chart_flow 2}}}</th><td>

a [versatiles container](http://github.com/versatiles-org/versatiles-spec), a much simpler and more efficient tile storage format than .mbtiles.
</td></tr>
<tr><th>{{{chart_flow 3}}}</th><td>

_Server is serving the vector tiles._
</td></tr>
<tr><th>{{{chart_flow 4}}}</th><td>

... but only speaks HTTP, because ...
</td></tr>
<tr><th>{{{chart_flow 5}}}</th><td>

_The Network handles the network stuff,_ like TLS certificates, caching, load balancing, etc.
</td></tr>
<tr><th>{{{chart_flow 6}}}</th><td>

Now we serve tiles to the internet ...
</td></tr>
<tr><th>{{{chart_flow 7}}}</th><td>

_The Frontend loads and renders the vector tiles._
</td></tr>
<tr><th>{{{chart_flow 8}}}</th><td>

Enjoy.
</td></tr>
</table>

We combined permissively licensed open source software, data, schemas and styles, such as [Tilemaker](https://tilemaker.org/), [Shortbread Tiles Schema](https://shortbread-tiles.org/schema/) and [MapLibre](https://maplibre.org/).

VersaTiles lets you use OpenStreetMap-based vector tiles, without any restrictions, locked-in paid services or attribution requirements beyond OpenStreetMap. You can use the [freely downloadable tilesets from VersaTiles](https://download.versatiles.org) on your own infrastructure, in any way you like. Our open spec, royalty-free and permissively licensed implementations work with virtually any architecture.


## What tools do we provide?

- [versatiles-generator](https://github.com/versatiles-org/versatiles-generator) provides scripts to generate tiles as VersaTiles containers. It uses a pre-built [Docker image](https://github.com/versatiles-org/versatiles-docker). We use the Generator regularly to generate tiles and upload them to [download.versatiles.org](https://download.versatiles.org).
- [shortbread-tilemaker](https://github.com/versatiles-org/shortbread-tilemaker) contains configuration files and scripts to configure Tilemaker to generate vector tiles in the [Shortbread schema](https://shortbread-tiles.org/).
- [node-versatiles-container](https://github.com/versatiles-org/node-versatiles-container) is an [NPM package](https://www.npmjs.com/package/@versatiles/container) for reading VersaTiles containers in Node.js.
- [node-versatiles-google-cloud](https://github.com/versatiles-org/node-versatiles-google-cloud) is a client written in Node.js to run a VersaTiles server in Google Cloud Run.
- [node-versatiles-server](https://github.com/versatiles-org/node-versatiles-server) is a server written in Node.js.
- [versatiles-rs](https://github.com/versatiles-org/versatiles-rs) is a multitool written in Rust. It can convert, compress, extract and serve VersaTiles containers.
- [versatiles-docker](https://github.com/versatiles-org/versatiles-docker) defines and builds multiple Docker images.
- [maplibre-versatiles-styler](https://github.com/versatiles-org/maplibre-versatiles-styler) is a MapLibre plugin for generating VersaTiles styles.
- [versatiles-style](https://github.com/versatiles-org/versatiles-style) generates and contains map styles and also provides an [NPM package](https://www.npmjs.com/package/@versatiles/style) for generating styles in JavaScript.
- [versatiles-fonts](https://github.com/versatiles-org/versatiles-fonts) generates glyphs.
- [versatiles-frontend](https://github.com/versatiles-org/versatiles-frontend) builds frontend packages.
- [versatiles-renderer](https://github.com/versatiles-org/versatiles-renderer) a preliminary tool to render maps in the backend as SVG or PNG.
- [versatiles-documentation](https://github.com/versatiles-org/versatiles-documentation) contains all the documentation \o/.


## Need more information?

We have collected some guides and explanations in our [documentation repository](https://github.com/versatiles-org/versatiles-documentation), including a [comprehensive compendium](https://github.com/versatiles-org/versatiles-documentation/blob/main/basics/compendium.md). Hopefully we will be able to integrate the documentation into the website in the near future.
