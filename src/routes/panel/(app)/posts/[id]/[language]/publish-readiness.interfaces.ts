export type SettingsTab = 'details' | 'seo' | 'settings';

export type PublishField = 'title' | 'content' | 'excerpt' | 'metaDescription';

export interface PublishIssue {
	field: PublishField;
	tab: SettingsTab | null;
}

export interface PublishReadinessInput {
	title: string;
	hasContent: boolean;
	excerpt: string;
	metaDescription: string;
}
