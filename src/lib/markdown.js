import { unified } from 'unified';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import matter from 'gray-matter';

async function markdownToHtml(content) {
	// Parse frontmatter from the markdown content
	const { data: metadata, content: markdownContent } = matter(content);
	let imports = new Set();

	function transformCodeBlocks() {
		return () => (tree) => {
			visit(tree, 'element', (node) => {
				if (node.tagName === 'chartflow') {
					imports.add('import ChartFlow from "$lib/components/ChartFlow.svelte";');
					node.tagName = 'ChartFlow';
					node.children = [];
				}
				if (node.tagName === 'pre' && node.children.length && node.children[0].tagName === 'code') {
					const codeNode = node.children[0];
					const language = codeNode.properties.className
						? codeNode.properties.className[0].replace('language-', '')
						: 'plaintext';
					const codeContent = codeNode.children[0].value
						.replace(/{/g, '&#123;')
						.replace(/}/g, '&#125;');

					imports.add('import CodeBlock from "$lib/components/CodeBlock.svelte";');
					// Replace the <pre><code> block with the <CodeBlock> component
					node.tagName = 'CodeBlock';
					node.properties = {
						code: codeContent,
						languageName: language
					};
					node.children = []; // No children needed for the custom component
				}
			});
		};
	}

	let result = (
		await unified()
			.use(remarkParse)
			.use(remarkRehype, { allowDangerousHtml: true })
			.use(rehypeRaw)
			.use(transformCodeBlocks())
			.use(rehypeStringify, { allowDangerousHtml: true })
			.process(markdownContent)
	).toString();

	// Generate the <svelte:head> content
	const headContent = [];
	if (metadata.title) headContent.push(`<title>${metadata.title}</title>`);

	if (headContent) {
		result = ['<svelte:head>', ...headContent, '</svelte:head>', result].join('\n');
	}

	if (imports.size > 0) {
		result = ['<script lang="ts">', ...Array.from(imports.values()), '</script>', result].join(
			'\n'
		);
	}

	return result;
}

function markdown() {
	return {
		name: 'markdown',
		markup: ({ content, filename }) => {
			if (filename.endsWith('.md')) {
				return markdownToHtml(content).then((code) => {
					return { code };
				});
			}
			return { code: content };
		}
	};
}

export default markdown;
