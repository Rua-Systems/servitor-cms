import type { CardFieldKind } from '../../constants/cards';

export interface CardFieldDefinition {
	key: string;
	label: string;
	kind: CardFieldKind;
	required: boolean;
	translatable: boolean;
	options: string[];
	currency: string | null;
}

export type CardValue = string | number | boolean;

export type CardValues = Record<string, CardValue>;

export type TranslatedCardValues = Record<string, string>;
