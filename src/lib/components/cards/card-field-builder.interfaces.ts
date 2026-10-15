import type { CardFieldKind } from '$lib/constants/cards';
import type { CardFieldDefinition } from '$lib/modules/interfaces/cards.interfaces';

export interface CardFieldBuilderProps {
	fields: CardFieldDefinition[];
}

export interface CardFieldRow {
	id: string;
	key: string;
	keyEdited: boolean;
	label: string;
	kind: CardFieldKind;
	required: boolean;
	translatable: boolean;
	optionsText: string;
	currency: string;
}
