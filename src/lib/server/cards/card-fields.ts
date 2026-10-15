import { z } from 'zod';
import {
	CARD_FIELD_KEY_PATTERN,
	CARD_FIELD_KINDS,
	CARD_FIELD_LABEL_MAX_LENGTH,
	CARD_FIELD_OPTION_MAX_LENGTH,
	CURRENCY_CODE_PATTERN,
	MAX_CARD_FIELD_OPTIONS,
	MAX_CARD_FIELDS,
	TRANSLATABLE_CARD_FIELD_KINDS
} from '../../constants/cards';
import type { CardFieldDefinition } from '../../modules/interfaces/cards.interfaces';
import type { CardTypeFormError } from './card-types.interfaces';

const rawFieldSchema = z.object({
	key: z.string().trim().max(40),
	label: z.string().trim().max(CARD_FIELD_LABEL_MAX_LENGTH),
	kind: z.enum(CARD_FIELD_KINDS),
	required: z.boolean(),
	translatable: z.boolean(),
	options: z
		.array(z.string().trim().max(CARD_FIELD_OPTION_MAX_LENGTH))
		.max(MAX_CARD_FIELD_OPTIONS),
	currency: z.string().trim().toUpperCase().max(10).nullable()
});

const rawFieldsSchema = z.array(rawFieldSchema);

export type CardFieldsResult =
	| { status: 'ok'; fields: CardFieldDefinition[] }
	| { status: 'invalid'; error: CardTypeFormError };

export function validateCardFields(value: unknown): CardFieldsResult {
	const parsed = rawFieldsSchema.safeParse(value);

	if (!parsed.success) {
		return { status: 'invalid', error: 'invalid_input' };
	}

	if (parsed.data.length > MAX_CARD_FIELDS) {
		return { status: 'invalid', error: 'too_many_fields' };
	}

	const keys = new Set<string>();
	const fields: CardFieldDefinition[] = [];

	for (const raw of parsed.data) {
		if (raw.label === '') {
			return { status: 'invalid', error: 'field_label_required' };
		}

		if (!CARD_FIELD_KEY_PATTERN.test(raw.key)) {
			return { status: 'invalid', error: 'invalid_field_key' };
		}

		if (keys.has(raw.key)) {
			return { status: 'invalid', error: 'duplicate_field_key' };
		}

		keys.add(raw.key);

		const options = uniqueOptions(raw.options);

		if (raw.kind === 'select' && options.length === 0) {
			return { status: 'invalid', error: 'options_required' };
		}

		if (raw.kind === 'price' && !CURRENCY_CODE_PATTERN.test(raw.currency ?? '')) {
			return { status: 'invalid', error: 'invalid_currency' };
		}

		fields.push(normalizedField(raw, options));
	}

	return { status: 'ok', fields };
}

export function parseStoredCardFields(json: string): CardFieldDefinition[] {
	let value: unknown;

	try {
		value = JSON.parse(json);
	} catch {
		return [];
	}

	const result = validateCardFields(value);

	if (result.status !== 'ok') {
		return [];
	}

	return result.fields;
}

function normalizedField(
	raw: z.infer<typeof rawFieldSchema>,
	options: string[]
): CardFieldDefinition {
	let currency: string | null = null;
	let fieldOptions: string[] = [];

	if (raw.kind === 'price') {
		currency = raw.currency;
	}

	if (raw.kind === 'select') {
		fieldOptions = options;
	}

	return {
		key: raw.key,
		label: raw.label,
		kind: raw.kind,
		required: raw.required,
		translatable: raw.translatable && TRANSLATABLE_CARD_FIELD_KINDS.includes(raw.kind),
		options: fieldOptions,
		currency
	};
}

function uniqueOptions(options: string[]): string[] {
	return [...new Set(options.filter((option) => option !== ''))];
}
