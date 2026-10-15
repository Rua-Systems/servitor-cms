import { DEFAULT_CARD_CURRENCY, type CardTypePreset } from '../../constants/cards';
import type { CardFieldDefinition } from '../../modules/interfaces/cards.interfaces';
import { m } from '../../paraglide/messages';

export function presetCardFields(preset: CardTypePreset): CardFieldDefinition[] {
	if (preset === 'product') {
		return productFields();
	}

	return [];
}

function productFields(): CardFieldDefinition[] {
	return [
		field('sku', m.card_preset_sku(), 'text', false, false),
		{
			...field('price', m.card_preset_price(), 'price', true, false),
			currency: DEFAULT_CARD_CURRENCY
		},
		{
			...field('sale_price', m.card_preset_sale_price(), 'price', false, false),
			currency: DEFAULT_CARD_CURRENCY
		},
		field('stock', m.card_preset_stock(), 'number', false, false),
		{
			...field('availability', m.card_preset_availability(), 'select', true, false),
			options: ['in_stock', 'out_of_stock', 'preorder']
		},
		field('brand', m.card_preset_brand(), 'text', false, false),
		field('details', m.card_preset_details(), 'long_text', false, true)
	];
}

function field(
	key: string,
	label: string,
	kind: CardFieldDefinition['kind'],
	required: boolean,
	translatable: boolean
): CardFieldDefinition {
	return { key, label, kind, required, translatable, options: [], currency: null };
}
