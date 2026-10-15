import type { CardFieldKind } from '$lib/constants/cards';
import { m } from '$lib/paraglide/messages';

export function cardTypeErrorMessage(error: string | undefined): string | null {
	switch (error) {
		case undefined:
			return null;
		case 'name_required':
			return m.card_types_error_name_required();
		case 'invalid_key':
			return m.card_types_error_invalid_key();
		case 'key_taken':
			return m.card_types_error_key_taken();
		case 'too_many_fields':
			return m.card_types_error_too_many_fields();
		case 'invalid_field_key':
			return m.card_types_error_invalid_field_key();
		case 'duplicate_field_key':
			return m.card_types_error_duplicate_field_key();
		case 'field_label_required':
			return m.card_types_error_field_label_required();
		case 'options_required':
			return m.card_types_error_options_required();
		case 'invalid_currency':
			return m.card_types_error_invalid_currency();
		case 'in_use':
			return m.card_types_error_in_use();
		default:
			return m.card_types_error_invalid_input();
	}
}

export function cardFieldKindLabel(kind: CardFieldKind): string {
	switch (kind) {
		case 'long_text':
			return m.card_field_kind_long_text();
		case 'number':
			return m.card_field_kind_number();
		case 'price':
			return m.card_field_kind_price();
		case 'select':
			return m.card_field_kind_select();
		case 'boolean':
			return m.card_field_kind_boolean();
		case 'url':
			return m.card_field_kind_url();
		case 'date':
			return m.card_field_kind_date();
		default:
			return m.card_field_kind_text();
	}
}
