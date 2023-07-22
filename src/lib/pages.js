
const fs = require('fs');
const { resolve } = require('path');

module.exports = { processPages };

function processPages(config, Handlebars) {
	fs.readdirSync(config.docsDir).forEach(filename => {
		if (!filename.endsWith('.html')) return;

		let page = fs.readFileSync(resolve(config.docsDir, filename), 'utf8');
		page = Handlebars.compile(page);
		page = page();
		fs.writeFileSync(resolve(config.distDir, filename), page, 'utf8');
	})
}
