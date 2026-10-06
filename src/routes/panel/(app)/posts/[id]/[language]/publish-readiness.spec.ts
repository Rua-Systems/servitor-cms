import { describe, expect, it } from 'vitest';
import { publishIssues, tabHasIssues } from './publish-readiness';
import type { PublishReadinessInput } from './publish-readiness.interfaces';

const complete: PublishReadinessInput = {
	title: 'Title',
	hasContent: true,
	excerpt: 'Summary',
	metaDescription: 'Description'
};

describe('publishIssues', () => {
	it('finds nothing when every required field is filled in', () => {
		expect(publishIssues(complete)).toEqual([]);
	});

	it('lists every missing field with the tab that holds it, in page order', () => {
		const issues = publishIssues({
			title: ' ',
			hasContent: false,
			excerpt: '',
			metaDescription: '\n'
		});

		expect(issues).toEqual([
			{ field: 'title', tab: null },
			{ field: 'content', tab: null },
			{ field: 'excerpt', tab: 'details' },
			{ field: 'metaDescription', tab: 'seo' }
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
