[![License](https://img.shields.io/badge/license-Unlicense-green)](https://unlicense.org/)

# versatiles.org Website

Repository for building the website for [versatiles.org](https://versatiles.org).

## Installation

Clone the repository and install the dependencies:

```bash
git clone "https://github.com/versatiles-org/versatiles-org.github.io.git
cd versatiles-org.github.io
```

## Development Scripts

This repository comes with deno scripts for building, previewing and developing the site:

- `deno task build`: Builds the site and outputs it to the `/dist/` directory for production use.
- `deno task dev`: Combines watching files and serving the site locally, automatically updating the site on file changes - basically a "**developer mode**".
