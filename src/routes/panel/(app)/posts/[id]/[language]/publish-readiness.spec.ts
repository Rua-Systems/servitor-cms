import { describe, expect, it } from 'vitest';
import type { CardFieldDefinition } from '$lib/modules/interfaces/cards.interfaces';
import { publishIssues, tabHasIssues } from './publish-readiness';
import type { PublishReadinessInput } from './publish-readiness.interfaces';

const complete: PublishReadinessInput = {
	title: 'Title',
	hasContent: true,
	excerpt: 'Summary',
	metaDescription: 'Description',
	card: null
};

function field(
	key: string,
	kind: CardFieldDefinition['kind'],
	extra: Partial<CardFieldDefinition> = {}
): CardFieldDefinition {
	return {
		key,
		label: key,
		kind,
		required: true,
		translatable: false,
		options: [],
		currency: null,
		...extra
	};
}

describe('publishIssues', () => {
	it('finds nothing when every required field is filled in', () => {
		expect(publishIssues(complete)).toEqual([]);
	});

	it('lists every missing field with the tab that holds it, in page order', () => {
		const issues = publishIssues({
			title: ' ',
			hasContent: false,
			excerpt: '',
			metaDescription: '\n',
			card: null
		});

		expect(issues).toEqual([
			{ field: 'title', tab: null, key: 'title' },
			{ field: 'content', tab: null, key: 'content' },
			{ field: 'excerpt', tab: 'details', key: 'excerpt' },
			{ field: 'metaDescription', tab: 'seo', key: 'metaDescription' }
		]);
	});

	it('asks a card only for its title and its required card fields', () => {
		const issues = publishIssues({
			title: '',
			hasContent: false,
			excerpt: '',
			metaDescription: '',
			card: {
				fields: [
					field('price', 'price'),
					field('gift', 'boolean'),
					field('tagline', 'text', { translatable: true }),
					field('brand', 'text', { required: false }),
					field('sku', 'text')
				],
				shared: { price: '10', gift: 'false', sku: ' ' },
				translated: { tagline: '' }
			}
		});

		expect(issues).toEqual([
			{ field: 'title', tab: null, key: 'title' },
			{ field: 'cardField', tab: 'card', key: 'gift' },
			{ field: 'cardField', tab: 'card', key: 'tagline' },
			{ field: 'cardField', tab: 'card', key: 'sku' }
		]);
	});
});

describe('tabHasIssues', () => {
	it('marks only the tabs that hold a missing field', () => {
		const issues = publishIssues({ ...complete, metaDescription: '' });

		expect(tabHasIssues(issues, 'seo')).toBe(true);
		expect(tabHasIssues(issues, 'details')).toBe(false);
		expect(tabHasIssues(issues, 'settings')).toBe(false);
	});
});
