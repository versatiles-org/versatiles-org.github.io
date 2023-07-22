
import { readdirSync } from 'node:fs';
//import {} from 'csso';
//import {}from  'uglify-js';
import { resolve } from 'node:path';

export async function build(config, handlebars) {
	for (let filename of readdirSync(config.src.helpers)) {
		if (!filename.endsWith('.js')) continue;

		let name = filename.replace(/\..*?$/, '');
		let fullname = resolve(config.src.helpers, filename);

		let fun = (await import(fullname)).default;
		
		handlebars.registerHelper(name, function (...args) {
			return fun(...args);
		})
	}

	/*
		handlebars.registerHelper('mergeJS', function (...filenames) {
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
	
		handlebars.registerHelper('mergeCSS', function (...filenames) {
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
		*/
}