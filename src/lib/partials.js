
const fs = require('fs');
const { resolve } = require('path');


module.exports = { installPartials };

function installPartials(config, Handlebars) {
	let partials = {};
	fs.readdirSync(config.partialsDir).forEach(filename => {
		if (!filename.endsWith('.html')) return;

		let name = filename.slice(0, -5);
		let partial = fs.readFileSync(resolve(config.partialsDir, filename), 'utf8');
		partials[name] = partial;
	})
	//console.log(partials);
	Handlebars.registerPartial(partials);
}
