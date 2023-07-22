
const fs = require('fs');
const csso = require('csso');
var uglifyjs = require('uglify-js');
const { resolve } = require('path');

module.exports = { installHelpers };

function installHelpers(config, Handlebars) {

	Handlebars.registerHelper('mergeJS', function (...filenames) {
		let options = filenames.pop();
		let resultFilename = filenames.shift();
		let result = [];
		filenames.forEach(filename => {
			if (!filename.endsWith('.js')) throw Error();
			let code = fs.readFileSync(resolve(config.docsDir, filename), 'utf8');
			result.push(code);
		})
		//result = result.join('\n');
		result = uglifyjs.minify(result).code;
		fs.writeFileSync(resolve(config.distDir, resultFilename), result);
		return `<script type="text/javascript" src="${resultFilename}"></script>`;
	})

	Handlebars.registerHelper('mergeCSS', function (...filenames) {
		let options = filenames.pop();
		let resultFilename = filenames.shift();
		let result = [];
		filenames.forEach(filename => {
			if (!filename.endsWith('.css')) throw Error();
			result.push(fs.readFileSync(resolve(config.docsDir, filename), 'utf8'));
		})
		result = csso.minify(result.join('\n')).css;
		fs.writeFileSync(resolve(config.distDir, resultFilename), result);
		return `<link rel="stylesheet" href="${resultFilename}" />`;
	})
}