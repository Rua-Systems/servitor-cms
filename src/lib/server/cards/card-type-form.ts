import { z } from 'zod';
import {
	CARD_TYPE_KEY_MAX_LENGTH,
	CARD_TYPE_KEY_PATTERN,
	CARD_TYPE_NAME_MAX_LENGTH,
	CARD_TYPE_PRESETS,
	type CardTypePreset
} from '../../constants/cards';
import type { CardFieldDefinition } from '../../modules/interfaces/cards.interfaces';
import { slugFromText } from '../content/slugs';
import { validateCardFields } from './card-fields';
import { presetCardFields } from './card-type-presets';
import type { CardTypeFormResult } from './card-types.interfaces';

const headerSchema = z.object({
	name: z.string().trim().max(CARD_TYPE_NAME_MAX_LENGTH),
	key: z.string().trim().toLowerCase().max(CARD_TYPE_KEY_MAX_LENGTH)
});

const presetSchema = z.enum(CARD_TYPE_PRESETS);

export function readNewCardType(
	fields: Record<string, string | undefined>,
	languageCode: string
): CardTypeFormResult {
	const preset = presetSchema.safeParse(fields.preset ?? 'blank');

	if (!preset.success) {
		return { status: 'invalid', error: 'invalid_input' };
	}

	return readHeader(fields, languageCode, presetCardFields(preset.data), preset.data);
}

export function readCardTypeUpdate(
	fields: Record<string, string | undefined>,
	languageCode: string
): CardTypeFormResult {
	let value: unknown;

	try {
		value = JSON.parse(fields.fields ?? '');
	} catch {
		return { status: 'invalid', error: 'invalid_input' };
	}

	const parsed = validateCardFields(value);

	if (parsed.status !== 'ok') {
		return parsed;
	}

	return readHeader(fields, languageCode, parsed.fields, null);
}

function readHeader(
	fields: Record<string, string | undefined>,
	languageCode: string,
	cardFields: CardFieldDefinition[],
	preset: CardTypePreset | null
): CardTypeFormResult {
	const header = headerSchema.safeParse({ name: fields.name ?? '', key: fields.key ?? '' });

	if (!header.success) {
		return { status: 'invalid', error: 'invalid_input' };
	}

	if (header.data.name === '') {
		return { status: 'invalid', error: 'name_required' };
	}

	const key = keyFor(header.data.key, header.data.name, languageCode, preset);

	if (!CARD_TYPE_KEY_PATTERN.test(key)) {
		return { status: 'invalid', error: 'invalid_key' };
	}

	return { status: 'ok', input: { key, name: header.data.name, fields: cardFields } };
}

function keyFor(
	requested: string,
	name: string,
	languageCode: string,
	preset: CardTypePreset | null
): string {
	if (requested !== '') {
		return requested;
	}

	const derived = slugFromText(name, languageCode).slice(0, CARD_TYPE_KEY_MAX_LENGTH);

	if (derived === '' && preset !== null && preset !== 'blank') {
		return preset;
	}

	return derived;
}
