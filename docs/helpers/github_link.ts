import { HelperOptions } from 'handlebars';

export default function (opt: HelperOptions) {
	let name = opt.data.root.filename;
	return `https://github.com/versatiles-org/versatiles-website/blob/main/docs/pages/${name}`;
}
