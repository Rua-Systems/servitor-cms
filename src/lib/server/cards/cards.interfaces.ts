import type { CardFieldDefinition, CardValues } from '../../modules/interfaces/cards.interfaces';

export interface CardDetails {
	type: {
		id: string;
		key: string;
		name: string;
		fields: CardFieldDefinition[];
	};
	values: CardValues;
	galleryMediaIds: string[];
}

export interface CardSettingsInput {
	values: Record<string, string>;
	galleryMediaIds: string[];
}

export type CardCreateResult =
	| { status: 'created'; postId: string; languageCode: string }
	| { status: 'unknown_language' }
	| { status: 'unknown_card_type' };

export type CardSettingsResult =
	| { status: 'saved' }
	| { status: 'not_found' }
	| { status: 'invalid_card_value'; key: string }
	| { status: 'invalid_media' }
	| { status: 'too_many_images' }
	| { status: 'locked' };
