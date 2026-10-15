import { z } from 'zod';
import {
	API_CARD_FIELD_SORT_PATTERN,
	API_CARD_FILTER_VALUE_MAX_LENGTH,
	API_CONTENT_FORMATS,
	API_DEFAULT_PER_PAGE,
	API_FALLBACK_MODES,
	API_MAX_CARD_FILTER_VALUES,
	API_MAX_LANGUAGE_FILTERS,
	API_MAX_PAGE,
	API_MAX_PER_PAGE,
	API_SEARCH_MAX_LENGTH,
	API_SORT_FIELDS,
	API_SORT_ORDERS
} from '../../constants/api';
import {
	CARD_FIELD_KEY_PATTERN,
	CARD_TYPE_KEY_MAX_LENGTH,
	CARD_TYPE_KEY_PATTERN
} from '../../constants/cards';
import { isLanguageTag, MAX_LANGUAGE_TAG_LENGTH } from '../languages/language-tags';

const DATE_ONLY_LENGTH = 10;

const languageTag = z
	.string()
	.max(MAX_LANGUAGE_TAG_LENGTH)
	.refine(isLanguageTag, 'must be a language tag such as en or pt-BR');

const page = z.coerce.number().int().min(1).max(API_MAX_PAGE).default(1);

const perPage = z.coerce.number().int().min(1).max(API_MAX_PER_PAGE).default(API_DEFAULT_PER_PAGE);

const contentFormat = z.enum(API_CONTENT_FORMATS).default('html');

function dateBoundary(time: string) {
	return z.union([z.iso.date(), z.iso.datetime({ offset: true })]).transform((value) => {
		if (value.length === DATE_ONLY_LENGTH) {
			return new Date(`${value}T${time}Z`);
		}

		return new Date(value);
	});
}

export const POST_LIST_QUERY = z.strictObject({
	lang: z.array(languageTag).min(1).max(API_MAX_LANGUAGE_FILTERS).optional(),
	category: z.uuid().optional(),
	tag: z.uuid().optional(),
	author: z.uuid().optional(),
	q: z.string().trim().min(1).max(API_SEARCH_MAX_LENGTH).optional(),
	published_from: dateBoundary('00:00:00.000').optional(),
	published_to: dateBoundary('23:59:59.999').optional(),
	sort: z.enum(API_SORT_FIELDS).default('published_at'),
	order: z.enum(API_SORT_ORDERS).default('desc'),
	page,
	per_page: perPage,
	fallback: z.enum(API_FALLBACK_MODES).default('none'),
	content_format: contentFormat
});

export const POST_LIST_REPEATABLE = ['lang'] as const;

export const POST_QUERY = z.strictObject({ content_format: contentFormat });

const filterValue = z.string().max(API_CARD_FILTER_VALUE_MAX_LENGTH);

const cardFieldFilter = z.strictObject({
	values: z.array(filterValue).max(API_MAX_CARD_FILTER_VALUES),
	min: filterValue.nullable(),
	max: filterValue.nullable()
});

export const CARD_LIST_QUERY = z.strictObject({
	lang: z.array(languageTag).min(1).max(API_MAX_LANGUAGE_FILTERS).optional(),
	type: z
		.string()
		.max(CARD_TYPE_KEY_MAX_LENGTH)
		.regex(CARD_TYPE_KEY_PATTERN, 'must be the key of a card type')
		.optional(),
	category: z.uuid().optional(),
	tag: z.uuid().optional(),
	q: z.string().trim().min(1).max(API_SEARCH_MAX_LENGTH).optional(),
	published_from: dateBoundary('00:00:00.000').optional(),
	published_to: dateBoundary('23:59:59.999').optional(),
	field: z
		.record(
			z.string().regex(CARD_FIELD_KEY_PATTERN, 'must be the key of a card field'),
			cardFieldFilter
		)
		.optional(),
	sort: z
		.string()
		.refine(
			(value) =>
				API_SORT_FIELDS.some((field) => field === value) ||
				API_CARD_FIELD_SORT_PATTERN.test(value),
			'must be published_at, updated_at or field.<key>'
		)
		.default('published_at'),
	order: z.enum(API_SORT_ORDERS).default('desc'),
	page,
	per_page: perPage,
	fallback: z.enum(API_FALLBACK_MODES).default('none'),
	content_format: contentFormat
});

export const CARD_LIST_REPEATABLE = ['lang'] as const;

export const LIST_QUERY = z.strictObject({ page, per_page: perPage });

export const TAG_LIST_QUERY = z.strictObject({ lang: languageTag, page, per_page: perPage });

export const EMPTY_QUERY = z.strictObject({});

export const POST_ID_PARAM = z.uuid();

export const API_QUERY_SCHEMAS = {
	'/posts': POST_LIST_QUERY,
	'/posts/{id}': POST_QUERY,
	'/posts/by-slug/{lang}/{slug}': POST_QUERY,
	'/cards': CARD_LIST_QUERY,
	'/cards/{id}': POST_QUERY,
	'/cards/by-slug/{lang}/{slug}': POST_QUERY,
	'/card-types': LIST_QUERY,
	'/languages': LIST_QUERY,
	'/categories': LIST_QUERY,
	'/tags': TAG_LIST_QUERY,
	'/authors': LIST_QUERY,
	'/openapi.json': EMPTY_QUERY
} as const;
