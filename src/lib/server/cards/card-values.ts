import {
	CARD_DATE_PATTERN,
	CARD_LONG_TEXT_MAX_LENGTH,
	CARD_TEXT_MAX_LENGTH,
	CARD_URL_MAX_LENGTH,
	CARD_VALUE_FIELD_PREFIX
} from '../../constants/cards';
import type {
	CardFieldDefinition,
	CardValue,
	CardValues,
	TranslatedCardValues
} from '../../modules/interfaces/cards.interfaces';
import type { CardValuesResult } from './card-values.interfaces';

const MAX_RAW_VALUES = 100;

export function sharedCardFields(fields: CardFieldDefinition[]): CardFieldDefinition[] {
	return fields.filter((field) => !field.translatable);
}

export function translatedCardFields(fields: CardFieldDefinition[]): CardFieldDefinition[] {
	return fields.filter((field) => field.translatable);
}

export function readRawCardValues(
	fields: Record<string, string | undefined>
): Record<string, string> {
	const values: Record<string, string> = {};

	for (const [name, value] of Object.entries(fields)) {
		if (
			name.startsWith(CARD_VALUE_FIELD_PREFIX) &&
			value !== undefined &&
			Object.keys(values).length < MAX_RAW_VALUES
		) {
			values[name.slice(CARD_VALUE_FIELD_PREFIX.length)] = value;
		}
	}

	return values;
}

export function readSharedCardValues(
	fields: CardFieldDefinition[],
	raw: Record<string, string>
): CardValuesResult<CardValues> {
	const values: CardValues = {};

	for (const field of sharedCardFields(fields)) {
		const parsed = parseValue(field, raw[field.key]);

		if (parsed === 'invalid') {
			return { status: 'invalid', key: field.key };
		}

		if (parsed !== null) {
			values[field.key] = parsed;
		}
	}

	return { status: 'ok', values };
}

export function readTranslatedCardValues(
	fields: CardFieldDefinition[],
	raw: Record<string, string>
): CardValuesResult<TranslatedCardValues> {
	const values: TranslatedCardValues = {};

	for (const field of translatedCardFields(fields)) {
		const parsed = parseValue(field, raw[field.key]);

		if (parsed === 'invalid') {
			return { status: 'invalid', key: field.key };
		}

		if (typeof parsed === 'string') {
			values[field.key] = parsed;
		}
	}

	return { status: 'ok', values };
}

export function missingCardFields(
	fields: CardFieldDefinition[],
	shared: CardValues,
	translated: TranslatedCardValues
): string[] {
	return fields
		.filter((field) => field.required)
		.filter((field) => {
			if (field.translatable) {
				return (translated[field.key] ?? '') === '';
			}

			return isEmptyValue(field, shared[field.key]);
		})
		.map((field) => field.key);
}

export function parseStoredCardValues(json: string): CardValues {
	const values: CardValues = {};

	for (const [key, value] of Object.entries(storedObject(json))) {
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			values[key] = value;
		}
	}

	return values;
}

export function parseStoredTranslatedValues(json: string): TranslatedCardValues {
	const values: TranslatedCardValues = {};

	for (const [key, value] of Object.entries(storedObject(json))) {
		if (typeof value === 'string') {
			values[key] = value;
		}
	}

	return values;
}

export function serializeCardValues(values: CardValues | TranslatedCardValues): string {
	return JSON.stringify(
		Object.fromEntries(
			Object.entries(values).sort(([left], [right]) => left.localeCompare(right))
		)
	);
}

function parseValue(
	field: CardFieldDefinition,
	raw: string | undefined
): CardValue | null | 'invalid' {
	if (field.kind === 'boolean') {
		return raw === 'on' || raw === 'true';
	}

	const value = (raw ?? '').trim();

	if (value === '') {
		return null;
	}

	switch (field.kind) {
		case 'text':
			return limited(value, CARD_TEXT_MAX_LENGTH);
		case 'long_text':
			return limited((raw ?? '').replace(/\r\n/g, '\n').trim(), CARD_LONG_TEXT_MAX_LENGTH);
		case 'number':
			return numberValue(value, false);
		case 'price':
			return numberValue(value, true);
		case 'select':
			return choiceValue(field, value);
		case 'url':
			return urlValue(value);
		default:
			return dateValue(value);
	}
}

function limited(value: string, max: number): string | 'invalid' {
	if (value.length > max) {
		return 'invalid';
	}

	return value;
}

function numberValue(value: string, price: boolean): number | 'invalid' {
	const number = Number(value.replace(',', '.'));

	if (!Number.isFinite(number)) {
		return 'invalid';
	}

	if (price && number < 0) {
		return 'invalid';
	}

	if (price) {
		return Math.round(number * 100) / 100;
	}

	return number;
}

function choiceValue(field: CardFieldDefinition, value: string): string | 'invalid' {
	if (!field.options.includes(value)) {
		return 'invalid';
	}

	return value;
}

function urlValue(value: string): string | 'invalid' {
	if (value.length > CARD_URL_MAX_LENGTH) {
		return 'invalid';
	}

	try {
		const url = new URL(value);

		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return 'invalid';
		}

		return url.href;
	} catch {
		return 'invalid';
	}
}

function dateValue(value: string): string | 'invalid' {
	if (!CARD_DATE_PATTERN.test(value)) {
		return 'invalid';
	}

	const date = new Date(`${value}T00:00:00Z`);

	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
		return 'invalid';
	}

	return value;
}

function isEmptyValue(field: CardFieldDefinition, value: CardValue | undefined): boolean {
	if (field.kind === 'boolean') {
		return value !== true;
	}

	return value === undefined || value === '';
}

function storedObject(json: string): Record<string, unknown> {
	try {
		const value: unknown = JSON.parse(json);

		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			return Object.fromEntries(Object.entries(value));
		}

		return {};
	} catch {
		return {};
	}
}

export function formCardValues(values: CardValues): Record<string, string> {
	return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)]));
}
