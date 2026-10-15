import type {
	CardReadinessInput,
	PublishIssue,
	PublishReadinessInput,
	SettingsTab
} from './publish-readiness.interfaces';

export function publishIssues(input: PublishReadinessInput): PublishIssue[] {
	const issues: PublishIssue[] = [];

	if (input.title.trim() === '') {
		issues.push({ field: 'title', tab: null, key: 'title' });
	}

	if (input.card !== null) {
		return [...issues, ...cardIssues(input.card)];
	}

	if (!input.hasContent) {
		issues.push({ field: 'content', tab: null, key: 'content' });
	}

	if (input.excerpt.trim() === '') {
		issues.push({ field: 'excerpt', tab: 'details', key: 'excerpt' });
	}

	if (input.metaDescription.trim() === '') {
		issues.push({ field: 'metaDescription', tab: 'seo', key: 'metaDescription' });
	}

	return issues;
}

export function tabHasIssues(issues: PublishIssue[], tab: SettingsTab): boolean {
	return issues.some((issue) => issue.tab === tab);
}

function cardIssues(card: CardReadinessInput): PublishIssue[] {
	return card.fields
		.filter((field) => field.required)
		.filter((field) => {
			if (field.translatable) {
				return (card.translated[field.key] ?? '').trim() === '';
			}

			if (field.kind === 'boolean') {
				return card.shared[field.key] !== 'true';
			}

			return (card.shared[field.key] ?? '').trim() === '';
		})
		.map((field) => ({ field: 'cardField', tab: 'card', key: field.key }));
}
