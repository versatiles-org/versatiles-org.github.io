
const fs = require('fs');
const { resolve } = require('path');

module.exports = { copyAssets };

function copyAssets(config) {
	fs.cpSync(
		resolve(config.docsDir, 'assets'),
		resolve(config.distDir, 'assets'),
		{ recursive: true }
	)
}
