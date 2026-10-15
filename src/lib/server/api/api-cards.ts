import { asc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import type { ApiContentFormat, ApiSortOrder } from '../../constants/api';
import type { CardFieldDefinition } from '../../modules/interfaces/cards.interfaces';
import { parseStoredCardFields } from '../cards/card-fields';
import { parseStoredCardValues, parseStoredTranslatedValues } from '../cards/card-values';
import { cardTypes, postGallery, postRevisions, postTranslations, posts } from '../db/schema';
import { taggedWith } from '../public/public-posts';
import { cardFieldConditions, cardSort, compareCardValues } from './api-card-fields';
import { ApiError } from './api-errors';
import { apiMediaMap, mediaFrom } from './api-media';
import {
	buildPosts,
	chooseTranslations,
	groupByPost,
	modifiedAt,
	selectCandidates,
	sortPosts
} from './api-posts';
import { paginate } from './api-resources';
import { latestDate } from './api-response';
import { searchCondition } from './api-search';
import type {
	ApiCard,
	ApiCardFilters,
	ApiCardSort,
	ApiCardTranslation,
	ApiCardType,
	ApiCardTypeRecord,
	ApiItem,
	ApiList,
	ApiRequestContext,
	ApiResult,
	ApiTranslation,
	TranslationCandidate
} from './api.interfaces';

type CandidateEntry = [string, TranslationCandidate[]];

function toRecord(row: typeof cardTypes.$inferSelect): ApiCardTypeRecord {
	return {
		id: row.id,
		key: row.key,
		name: row.name,
		fields: parseStoredCardFields(row.fieldsJson),
		updatedAt: row.updatedAt
	};
}

function requestedType(context: ApiRequestContext, key: string | null): ApiCardTypeRecord | null {
	if (key === null) {
		return null;
	}

	const row = context.db.select().from(cardTypes).where(eq(cardTypes.key, key)).get();

	if (row === undefined) {
		throw new ApiError(
			400,
			'invalid_query',
			`Invalid value for "type": the card type "${key}" does not exist.`
		);
	}

	return toRecord(row);
}

export function listApiCards(
	context: ApiRequestContext,
	filters: ApiCardFilters
): ApiResult<ApiList<ApiCard>> {
	const type = requestedType(context, filters.typeKey);
	const fields = type?.fields ?? null;
	const sort = cardSort(fields, filters.sort);
	const conditions = [
		...filterConditions(context, filters, type),
		...cardFieldConditions(fields, filters.fields)
	];
	const groups = chooseTranslations(
		context,
		groupByPost(selectCandidates(context, conditions, 'card')),
		filters,
		'card'
	);
	const ordered = sortCards(context, [...groups], sort, filters.order);
	const start = (filters.page - 1) * filters.perPage;
	const pageEntries = ordered.slice(start, start + filters.perPage);

	return {
		body: {
			data: buildCards(context, pageEntries, filters.contentFormat),
			meta: {
				page: filters.page,
				per_page: filters.perPage,
				total: ordered.length,
				total_pages: Math.ceil(ordered.length / filters.perPage)
			}
		},
		lastModified: latestDate(pageEntries.flatMap(([, rows]) => rows.map(modifiedAt)))
	};
}

export function findApiCard(
	context: ApiRequestContext,
	cardId: string,
	contentFormat: ApiContentFormat
): ApiResult<ApiItem<ApiCard>> | null {
	const rows = selectCandidates(context, [eq(postTranslations.postId, cardId)], 'card');
	const [card] = buildCards(context, [[cardId, rows]], contentFormat);

	if (rows.length === 0 || card === undefined) {
		return null;
	}

	return { body: { data: card }, lastModified: latestDate(rows.map(modifiedAt)) };
}

export function findApiCardBySlug(
	context: ApiRequestContext,
	languageCode: string,
	slug: string,
	contentFormat: ApiContentFormat
): ApiResult<ApiItem<ApiCard>> | null {
	const [match] = selectCandidates(
		context,
		[eq(postTranslations.languageCode, languageCode), eq(postTranslations.slug, slug)],
		'card'
	);

	if (match === undefined) {
		return null;
	}

	return findApiCard(context, match.postId, contentFormat);
}

export function listApiCardTypes(
	context: ApiRequestContext,
	page: number,
	perPage: number
): ApiResult<ApiList<ApiCardType>> {
	const types = context.db
		.select()
		.from(cardTypes)
		.orderBy(asc(cardTypes.name), asc(cardTypes.key))
		.all()
		.map(toRecord);
	const body = paginate(
		types.map((type): ApiCardType => ({
			id: type.id,
			key: type.key,
			name: type.name,
			fields: type.fields.map((field) => ({ ...field })),
			updated_at: type.updatedAt.toISOString()
		})),
		page,
		perPage
	);

	return { body, lastModified: latestDate(types.map((type) => type.updatedAt)) };
}

function filterConditions(
	context: ApiRequestContext,
	filters: ApiCardFilters,
	type: ApiCardTypeRecord | null
): SQL[] {
	const conditions: SQL[] = [];

	if (type !== null) {
		conditions.push(eq(posts.cardTypeId, type.id));
	}

	if (filters.categoryId !== null) {
		conditions.push(eq(posts.categoryId, filters.categoryId));
	}

	if (filters.tagId !== null) {
		conditions.push(taggedWith(context.db, filters.tagId));
	}

	if (filters.search !== null) {
		conditions.push(searchCondition(filters.search));
	}

	if (filters.publishedFrom !== null) {
		conditions.push(gte(postTranslations.publishedAt, filters.publishedFrom));
	}

	if (filters.publishedTo !== null) {
		conditions.push(lte(postTranslations.publishedAt, filters.publishedTo));
	}

	return conditions;
}

function sortCards(
	context: ApiRequestContext,
	entries: CandidateEntry[],
	sort: ApiCardSort,
	order: ApiSortOrder
): CandidateEntry[] {
	if (sort.by === 'date') {
		return sortPosts(entries, sort.field, order);
	}

	if (entries.length === 0) {
		return entries;
	}

	const key = sort.field.key;
	const values = new Map(
		context.db
			.select({ id: posts.id, valuesJson: posts.cardValuesJson })
			.from(posts)
			.where(
				inArray(
					posts.id,
					entries.map(([postId]) => postId)
				)
			)
			.all()
			.map((row) => [row.id, parseStoredCardValues(row.valuesJson)[key]])
	);
	let direction = 1;

	if (order === 'desc') {
		direction = -1;
	}

	return [...entries].sort(
		(first, second) =>
			compareCardValues(values.get(first[0]), values.get(second[0]), direction) ||
			first[0].localeCompare(second[0])
	);
}

function sharedValues(fields: CardFieldDefinition[], json: string): ApiCard['values'] {
	const stored = parseStoredCardValues(json);

	return Object.fromEntries(
		fields
			.filter((field) => !field.translatable)
			.map((field) => {
				if (field.kind === 'boolean') {
					return [field.key, stored[field.key] === true];
				}

				return [field.key, stored[field.key] ?? null];
			})
	);
}

function translatedValues(
	fields: CardFieldDefinition[],
	json: string
): Record<string, string | null> {
	const stored = parseStoredTranslatedValues(json);

	return Object.fromEntries(
		fields
			.filter((field) => field.translatable)
			.map((field) => [field.key, stored[field.key] ?? null])
	);
}

function cardTranslation(
	translation: ApiTranslation,
	values: Record<string, string | null>
): ApiCardTranslation {
	const result: ApiCardTranslation = {
		id: translation.id,
		language: translation.language,
		slug: translation.slug,
		title: translation.title,
		excerpt: translation.excerpt,
		meta_title: translation.meta_title,
		meta_description: translation.meta_description,
		og_image: translation.og_image,
		tags: translation.tags,
		values,
		published_at: translation.published_at,
		updated_at: translation.updated_at
	};

	if (translation.content_html !== undefined) {
		result.content_html = translation.content_html;
	}

	if (translation.content_json !== undefined) {
		result.content_json = translation.content_json;
	}

	return result;
}

function buildCards(
	context: ApiRequestContext,
	entries: CandidateEntry[],
	contentFormat: ApiContentFormat
): ApiCard[] {
	const built = buildPosts(context, entries, contentFormat);

	if (built.length === 0) {
		return [];
	}

	const { db } = context;
	const postIds = built.map((post) => post.id);
	const cardRows = new Map(
		db
			.select({
				id: posts.id,
				cardTypeId: posts.cardTypeId,
				valuesJson: posts.cardValuesJson
			})
			.from(posts)
			.where(inArray(posts.id, postIds))
			.all()
			.map((row) => [row.id, row])
	);
	const typeIds = [...cardRows.values()]
		.map((row) => row.cardTypeId)
		.filter((id): id is string => id !== null);
	const types = new Map(
		db
			.select()
			.from(cardTypes)
			.where(inArray(cardTypes.id, [...new Set(typeIds)]))
			.all()
			.map((row) => [row.id, toRecord(row)])
	);
	const translationValues = new Map(
		db
			.select({ id: postTranslations.id, valuesJson: postRevisions.cardValuesJson })
			.from(postTranslations)
			.innerJoin(postRevisions, eq(postRevisions.id, postTranslations.liveRevisionId))
			.where(
				inArray(
					postTranslations.id,
					built.flatMap((post) => post.translations.map((translation) => translation.id))
				)
			)
			.all()
			.map((row) => [row.id, row.valuesJson])
	);
	const galleryRows = db
		.select()
		.from(postGallery)
		.where(inArray(postGallery.postId, postIds))
		.orderBy(asc(postGallery.position))
		.all();
	const mediaMap = apiMediaMap(
		db,
		context.origin,
		galleryRows.map((row) => row.mediaId),
		context.languages.map((language) => language.code)
	);

	return built.flatMap((post): ApiCard[] => {
		const card = cardRows.get(post.id);
		const type = types.get(card?.cardTypeId ?? '');

		if (card === undefined || type === undefined) {
			return [];
		}

		return [
			{
				id: post.id,
				type: { id: type.id, key: type.key, name: type.name },
				category: post.category,
				cover: post.cover,
				gallery: galleryRows
					.filter((row) => row.postId === post.id)
					.map((row) => mediaFrom(mediaMap, row.mediaId))
					.filter((entry) => entry !== null),
				values: sharedValues(type.fields, card.valuesJson),
				published_at: post.published_at,
				updated_at: post.updated_at,
				translations: post.translations.map((translation) =>
					cardTranslation(
						translation,
						translatedValues(type.fields, translationValues.get(translation.id) ?? '{}')
					)
				)
			}
		];
	});
}
