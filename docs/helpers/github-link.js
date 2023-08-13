
export default function (arg) {
	let name = arg.data.root.filename;
	return `https://github.com/versatiles-org/versatiles-website/blob/main/docs/pages/${name}`;
}
