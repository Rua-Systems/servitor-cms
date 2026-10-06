import type {
	PublishIssue,
	PublishReadinessInput,
	SettingsTab
} from './publish-readiness.interfaces';

export function publishIssues(input: PublishReadinessInput): PublishIssue[] {
	const issues: PublishIssue[] = [];

	if (input.title.trim() === '') {
		issues.push({ field: 'title', tab: null });
	}

	if (!input.hasContent) {
		issues.push({ field: 'content', tab: null });
	}

	if (input.excerpt.trim() === '') {
		issues.push({ field: 'excerpt', tab: 'details' });
	}

	if (input.metaDescription.trim() === '') {
		issues.push({ field: 'metaDescription', tab: 'seo' });
	}

	return issues;
}

export function tabHasIssues(issues: PublishIssue[], tab: SettingsTab): boolean {
	return issues.some((issue) => issue.tab === tab);
}
