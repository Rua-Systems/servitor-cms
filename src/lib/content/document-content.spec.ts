import { describe, expect, it } from 'vitest';
import { hasDocumentContent } from './document-content';

function documentOf(...content: unknown[]): string {
	return JSON.stringify({ type: 'doc', content });
}

describe('hasDocumentContent', () => {
	it('finds text in nested blocks', () => {
		const list = {
			type: 'bulletList',
			content: [
				{
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item' }] }]
				}
			]
		};

		expect(hasDocumentContent(documentOf(list))).toBe(true);
	});

	it.each([
		{ type: 'image', attrs: { src: '/media/abc/content.webp', alt: '' } },
		{ type: 'videoEmbed', attrs: { provider: 'youtube', id: 'abc' } },
		{ type: 'blockMath', attrs: { latex: 'E = mc^2' } },
		{ type: 'paragraph', content: [{ type: 'inlineMath', attrs: { latex: 'x' } }] }
	])('counts a $type block as content', (block) => {
		expect(hasDocumentContent(documentOf(block))).toBe(true);
	});

	it.each([
		['an empty document', documentOf()],
		['an empty paragraph', documentOf({ type: 'paragraph' })],
		[
			'whitespace only',
			documentOf({ type: 'paragraph', content: [{ type: 'text', text: '   \n ' }] })
		],
		['a horizontal rule only', documentOf({ type: 'horizontalRule' })],
		['an empty string', ''],
		['invalid JSON', '{'],
		['a value that is not a document', 'null']
	])('reports no content for %s', (_label, json) => {
		expect(hasDocumentContent(json)).toBe(false);
	});
});
