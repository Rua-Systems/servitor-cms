import type { CardFieldDefinition } from '$lib/modules/interfaces/cards.interfaces';

export type SettingsTab = 'card' | 'details' | 'seo' | 'settings';

export type PublishField = 'title' | 'content' | 'excerpt' | 'metaDescription' | 'cardField';

export interface PublishIssue {
	field: PublishField;
	tab: SettingsTab | null;
	key: string;
}

export interface CardReadinessInput {
	fields: CardFieldDefinition[];
	shared: Record<string, string>;
	translated: Record<string, string>;
}

export interface PublishReadinessInput {
	title: string;
	hasContent: boolean;
	excerpt: string;
	metaDescription: string;
	card: CardReadinessInput | null;
}
