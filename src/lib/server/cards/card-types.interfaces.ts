import type { CardFieldDefinition } from '../../modules/interfaces/cards.interfaces';

export interface CardTypeView {
	id: string;
	key: string;
	name: string;
	fields: CardFieldDefinition[];
	cardCount: number;
	createdAt: Date;
	updatedAt: Date;
}

export interface CardTypeInput {
	key: string;
	name: string;
	fields: CardFieldDefinition[];
}

export type CardTypeFormError =
	| 'invalid_input'
	| 'name_required'
	| 'invalid_key'
	| 'too_many_fields'
	| 'invalid_field_key'
	| 'duplicate_field_key'
	| 'field_label_required'
	| 'options_required'
	| 'invalid_currency';

export type CardTypeFormResult =
	{ status: 'ok'; input: CardTypeInput } | { status: 'invalid'; error: CardTypeFormError };

export type CardTypeSaveResult =
	{ status: 'saved'; id: string } | { status: 'not_found' } | { status: 'key_taken' };

export type CardTypeDeleteResult = 'deleted' | 'not_found' | 'in_use';
