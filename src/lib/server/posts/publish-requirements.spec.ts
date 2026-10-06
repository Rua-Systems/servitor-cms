import { describe, expect, it } from 'vitest';
import { paragraphs } from '../testing/posts';
import type { TranslationDraftInput } from './posts.interfaces';
import { missingPublishRequirement } from './publish-requirements';

function input(overrides: Partial<TranslationDraftInput>): TranslationDraftInput {
	return {
		title: 'Title',
		slug: '',
		excerpt: 'Summary',
		metaTitle: null,
		metaDescription: 'Description',
		ogMediaId: null,
		tags: '',
		content: paragraphs('Body'),
		version: 1,
		...overrides
	};
}

describe('missingPublishRequirement', () => {
	it('accepts a translation with a title, content, an excerpt and a meta description', () => {
		expect(missingPublishRequirement(input({}))).toBeNull();
	});

	it.each([
		['title_required', { title: '  ' }],
		['content_required', { content: JSON.stringify({ type: 'doc', content: [] }) }],
		['excerpt_required', { excerpt: '' }],
		['meta_description_required', { metaDescription: ' ' }],
		['meta_description_required', { metaDescription: null }]
	])('reports %s', (status, overrides) => {
		expect(missingPublishRequirement(input(overrides))).toBe(status);
	});

	it('reports the fields in the order of the page', () => {
		expect(missingPublishRequirement(input({ excerpt: '', metaDescription: '' }))).toBe(
			'excerpt_required'
		);
	});
});
