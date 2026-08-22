[![License](https://img.shields.io/badge/license-Unlicense-green)](https://unlicense.org/)

# versatiles.org Website

Repository for building the website for [versatiles.org](https://versatiles.org).

## Installation

Clone the repository and install the dependencies:

```bash
git clone "https://github.com/versatiles-org/versatiles-org.github.io.git
cd versatiles-org.github.io
npm install
```

Requires Node.js 24 or newer — the sources are TypeScript and run directly via
Node's type stripping, with no build step.

## Development Scripts

- `npm run dev`: Watches `src/` and `docs/`, rebuilds on change and serves the site
  locally with live reload - basically a "**developer mode**".
- `npm run build`: Builds the site and outputs it to the `/dist/` directory for production use.
- `npm test`: Runs the test suite.
- `npm run check`: Formats, lints, typechecks and tests - everything CI runs.
