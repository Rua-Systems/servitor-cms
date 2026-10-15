import { inArray, sql, type SQL } from 'drizzle-orm';
import {
	API_CARD_FIELD_BOUNDS,
	API_CARD_FIELD_PARAM,
	API_CARD_FIELD_SORT_PREFIX,
	API_MAX_CARD_FIELD_FILTERS,
	API_SORT_FIELDS
} from '../../constants/api';
import { CARD_DATE_PATTERN } from '../../constants/cards';
import type { CardFieldDefinition, CardValue } from '../../modules/interfaces/cards.interfaces';
import { posts } from '../db/schema';
import { ApiError } from './api-errors';
import { queryValues } from './api-query';
import type { ApiCardFieldFilter, ApiCardSort } from './api.interfaces';

const FIELD_PARAM = /^field\[([^[\]]+)\](?:\[(min|max)\])?$/;

function invalid(name: string, reason: string): ApiError {
	return new ApiError(400, 'invalid_query', `Invalid value for "${name}": ${reason}.`);
}

function typeRequired(): ApiError {
	return new ApiError(
		400,
		'invalid_query',
		'Filtering or sorting by card fields needs the "type" parameter.'
	);
}

export function cardQueryValues(url: URL, repeatable: readonly string[]): Record<string, unknown> {
	const rest = new URL(url);
	const fields: Record<string, ApiCardFieldFilter> = {};

	for (const name of new Set(url.searchParams.keys())) {
		if (!name.startsWith(`${API_CARD_FIELD_PARAM}[`)) {
			continue;
		}

		rest.searchParams.delete(name);

		const match = FIELD_PARAM.exec(name);

		if (match === null) {
			throw new ApiError(400, 'invalid_query', `Unknown query parameter "${name}".`);
		}

		const key = match[1];
		const bound = API_CARD_FIELD_BOUNDS.find((entry) => entry === match[2]);
		const filter = fields[key] ?? { values: [], min: null, max: null };
		const entries = url.searchParams.getAll(name);

		if (bound === undefined) {
			filter.values = entries
				.flatMap((entry) => entry.split(','))
				.map((entry) => entry.trim())
				.filter((entry) => entry !== '');
		} else if (entries.length > 1) {
			throw new ApiError(
				400,
				'invalid_query',
				`The query parameter "${name}" may only appear once.`
			);
		} else {
			filter[bound] = entries[0].trim();
		}

		fields[key] = filter;
	}

	if (Object.keys(fields).length > API_MAX_CARD_FIELD_FILTERS) {
		throw new ApiError(
			400,
			'invalid_query',
			`At most ${API_MAX_CARD_FIELD_FILTERS} card fields can be filtered at once.`
		);
	}

	const values: Record<string, unknown> = queryValues(rest, repeatable);

	if (Object.keys(fields).length > 0) {
		values[API_CARD_FIELD_PARAM] = fields;
	}

	return values;
}

export function cardFieldConditions(
	fields: CardFieldDefinition[] | null,
	filters: Record<string, ApiCardFieldFilter>
): SQL[] {
	const entries = Object.entries(filters);

	if (entries.length === 0) {
		return [];
	}

	if (fields === null) {
		throw typeRequired();
	}

	return entries.flatMap(([key, filter]) =>
		fieldConditions(filterableField(fields, key, `${API_CARD_FIELD_PARAM}[${key}]`), filter)
	);
}

export function cardSort(fields: CardFieldDefinition[] | null, sort: string): ApiCardSort {
	const dateField = API_SORT_FIELDS.find((field) => field === sort);

	if (dateField !== undefined) {
		return { by: 'date', field: dateField };
	}

	if (!sort.startsWith(API_CARD_FIELD_SORT_PREFIX)) {
		throw invalid('sort', 'must be published_at, updated_at or field.<key>');
	}

	if (fields === null) {
		throw typeRequired();
	}

	return {
		by: 'field',
		field: filterableField(fields, sort.slice(API_CARD_FIELD_SORT_PREFIX.length), 'sort')
	};
}

export function compareCardValues(
	first: CardValue | undefined,
	second: CardValue | undefined,
	direction: number
): number {
	if (first === undefined && second === undefined) {
		return 0;
	}

	if (first === undefined) {
		return 1;
	}

	if (second === undefined) {
		return -1;
	}

	if (typeof first === 'string' && typeof second === 'string') {
		return first.localeCompare(second) * direction;
	}

	return (Number(first) - Number(second)) * direction;
}

function filterableField(
	fields: CardFieldDefinition[],
	key: string,
	name: string
): CardFieldDefinition {
	const field = fields.find((entry) => entry.key === key);

	if (field === undefined) {
		throw invalid(name, `the card type has no field "${key}"`);
	}

	if (field.translatable || field.kind === 'long_text') {
		throw invalid(name, `the field "${key}" cannot be filtered or sorted`);
	}

	return field;
}

function storedValue(key: string): SQL {
	return sql`json_extract(${posts.cardValuesJson}, ${`$.${key}`})`;
}

function fieldConditions(field: CardFieldDefinition, filter: ApiCardFieldFilter): SQL[] {
	const name = `${API_CARD_FIELD_PARAM}[${field.key}]`;
	const value = storedValue(field.key);
	const conditions: SQL[] = [];

	if (filter.values.length > 0) {
		conditions.push(equalTo(field, value, filter.values, name));
	}

	if (filter.min !== null) {
		conditions.push(sql`${value} >= ${rangeValue(field, filter.min, `${name}[min]`)}`);
	}

	if (filter.max !== null) {
		conditions.push(sql`${value} <= ${rangeValue(field, filter.max, `${name}[max]`)}`);
	}

	return conditions;
}

function equalTo(field: CardFieldDefinition, value: SQL, raw: string[], name: string): SQL {
	if (field.kind !== 'boolean') {
		return inArray(
			value,
			raw.map((entry) => exactValue(field, entry, name))
		);
	}

	if (raw.length !== 1 || (raw[0] !== 'true' && raw[0] !== 'false')) {
		throw invalid(name, 'must be true or false');
	}

	if (raw[0] === 'true') {
		return sql`${value} = 1`;
	}

	return sql`coalesce(${value}, 0) = 0`;
}

function exactValue(field: CardFieldDefinition, raw: string, name: string): CardValue {
	switch (field.kind) {
		case 'number':
		case 'price':
			return numberFrom(raw, name);
		case 'date':
			return dateFrom(raw, name);
		case 'select':
			if (!field.options.includes(raw)) {
				throw invalid(name, `"${raw}" is not an option of the field`);
			}

			return raw;
		default:
			return raw;
	}
}

function rangeValue(field: CardFieldDefinition, raw: string, name: string): CardValue {
	switch (field.kind) {
		case 'number':
		case 'price':
			return numberFrom(raw, name);
		case 'date':
			return dateFrom(raw, name);
		default:
			throw invalid(name, 'only numbers, prices and dates have ranges');
	}
}

function numberFrom(raw: string, name: string): number {
	const number = Number(raw);

	if (raw === '' || !Number.isFinite(number)) {
		throw invalid(name, 'must be a number');
	}

	return number;
}

function dateFrom(raw: string, name: string): string {
	if (!CARD_DATE_PATTERN.test(raw)) {
		throw invalid(name, 'must be a date such as 2026-10-16');
	}

	return raw;
}
