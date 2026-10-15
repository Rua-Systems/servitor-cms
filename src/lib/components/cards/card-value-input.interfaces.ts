import type { CardFieldDefinition } from '$lib/modules/interfaces/cards.interfaces';

export interface CardValueInputProps {
	field: CardFieldDefinition;
	id: string;
	value: string;
	name?: string;
	disabled?: boolean;
	onInput?: (value: string) => void;
	onBlur?: () => void;
}
