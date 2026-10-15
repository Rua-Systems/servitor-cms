import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AuthUser } from '../auth/auth';
import { presetCardFields } from '../cards/card-type-presets';
import { createCardType } from '../cards/card-types';
import { createCard, updateCardSettings } from '../cards/cards';
import { media } from '../db/schema';
import { ensureDefaultContentLanguage } from '../languages/languages';
import { createLogger } from '../logging/logger';
import { apiRequest, insertTestApiKey } from '../testing/api';
import { TestCookieJar } from '../testing/cookie-jar';
import { createTestPost, paragraphs, publishTestDraft } from '../testing/posts';
import { createTestRuntime } from '../testing/runtime';
import {
	cardBySlugEndpoint,
	cardEndpoint,
	cardsEndpoint,
	cardTypesEndpoint,
	postEndpoint,
	postsEndpoint
} from './api-endpoints';

const PASSWORD = 'Kx7-quiet-harbor-19';

const IMAGE_IDS = ['3f2504e0-4f89-41d3-9a0c-0305e82c3301', '3f2504e0-4f89-41d3-9a0c-0305e82c3302'];

let harness: ReturnType<typeof createTestRuntime>;

let founder: AuthUser;

let key: string;

let lampId: string;

let chairId: string;

let stoolId: string;

let postId: string;

function request() {
	return harness.request(new TestCookieJar());
}

function newType(typeKey: string, name: string, extra: ReturnType<typeof presetCardFields>) {
	const created = createCardType(harness.runtime, request(), founder, {
		key: typeKey,
		name,
		fields: [...presetCardFields('product'), ...extra]
	});

	if (created.status !== 'saved') {
		throw new Error('Expected the card type to be created');
	}

	return created.id;
}

function publishCard(
	typeId: string,
	title: string,
	slug: string,
	values: Record<string, string>,
	galleryMediaIds: string[] = []
): string {
	const created = createCard(harness.runtime, founder, typeId, 'en');

	if (created.status !== 'created') {
		throw new Error('Expected the card to be created');
	}

	expect(
		updateCardSettings(harness.runtime, founder, created.postId, { values, galleryMediaIds })
	).toEqual({ status: 'saved' });
	expect(
		publishTestDraft(harness.runtime, request(), founder, created.postId, {
			title,
			slug,
			content: paragraphs(`${title} details`),
			cardValues: { tagline: `${title} tagline` }
		})
	).toEqual({ status: 'done', outcome: 'published' });

	return created.postId;
}

beforeEach(async () => {
	harness = createTestRuntime();
	ensureDefaultContentLanguage(harness.runtime.db, harness.runtime.env, createLogger('silent'));
	await harness.createUser({ email: 'founder@example.com', password: PASSWORD, role: 'founder' });
	founder = (await harness.signIn('founder@example.com', PASSWORD)).actor;
	harness.runtime.db
		.insert(media)
		.values(
			IMAGE_IDS.map((id) => ({
				id,
				ownerId: founder.id,
				sourceFormat: 'png' as const,
				width: 800,
				height: 600,
				byteSize: 1000
			}))
		)
		.run();

	const extra = [
		{
			key: 'tagline',
			label: 'Tagline',
			kind: 'text' as const,
			required: false,
			translatable: true,
			options: [],
			currency: null
		},
		{
			key: 'featured',
			label: 'Featured',
			kind: 'boolean' as const,
			required: false,
			translatable: false,
			options: [],
			currency: null
		},
		{
			key: 'released',
			label: 'Released',
			kind: 'date' as const,
			required: false,
			translatable: false,
			options: [],
			currency: null
		}
	];
	const lamps = newType('lamp', 'Lamps', extra);
	const chairs = newType('chair', 'Chairs', extra);

	lampId = publishCard(
		lamps,
		'Desk lamp',
		'desk-lamp',
		{ price: '49.5', availability: 'in_stock', featured: 'on', released: '2026-03-01' },
		[IMAGE_IDS[1], IMAGE_IDS[0]]
	);
	chairId = publishCard(chairs, 'Oak chair', 'oak-chair', {
		price: '120',
		availability: 'preorder',
		released: '2026-06-15'
	});
	stoolId = publishCard(chairs, 'Bar stool', 'bar-stool', {
		price: '35',
		availability: 'in_stock'
	});

	const draft = createCard(harness.runtime, founder, lamps, 'en');

	expect(draft.status).toBe('created');

	postId = createTestPost(harness.runtime, founder);
	publishTestDraft(harness.runtime, request(), founder, postId, { title: 'A plain post' });

	key = insertTestApiKey(harness.runtime.db, founder.id).key;
});

afterEach(() => {
	harness.dispose();
});

type Endpoint = (runtime: typeof harness.runtime, event: ReturnType<typeof apiRequest>) => Response;

async function call(endpoint: Endpoint, path: string) {
	const response = endpoint(harness.runtime, apiRequest(path, key));

	return { status: response.status, body: await response.json() };
}

async function cardIds(path: string): Promise<string[]> {
	const { status, body } = await call(cardsEndpoint, path);

	expect(status, JSON.stringify(body)).toBe(200);

	return body.data.map((card: { id: string }) => card.id);
}

async function rejected(path: string): Promise<string> {
	const { status, body } = await call(cardsEndpoint, path);

	expect(status).toBe(400);
	expect(body.error.code).toBe('invalid_query');

	return body.error.message;
}

describe('the card API', () => {
	it('lists published cards with their type, values and gallery, apart from posts', async () => {
		const { body } = await call(cardsEndpoint, '/cards?sort=published_at&order=asc');

		expect(body.meta).toEqual({ page: 1, per_page: 20, total: 3, total_pages: 1 });
		expect(body.data.map((card: { id: string }) => card.id)).toEqual([
			lampId,
			chairId,
			stoolId
		]);

		const [lamp] = body.data;

		expect(lamp).toMatchObject({
			type: { key: 'lamp', name: 'Lamps' },
			values: {
				sku: null,
				price: 49.5,
				sale_price: null,
				availability: 'in_stock',
				featured: true,
				released: '2026-03-01'
			},
			gallery: [{ id: IMAGE_IDS[1] }, { id: IMAGE_IDS[0] }]
		});
		expect(lamp.translations).toHaveLength(1);
		expect(lamp.translations[0]).toMatchObject({
			language: 'en',
			slug: 'desk-lamp',
			title: 'Desk lamp',
			values: { details: null, tagline: 'Desk lamp tagline' }
		});
		expect(lamp.translations[0]).not.toHaveProperty('url');
		expect(lamp.translations[0].content_html).toContain('Desk lamp details');
		expect(body.data[2].values.featured).toBe(false);

		const posts = await call(postsEndpoint, '/posts');

		expect(posts.body.data.map((post: { id: string }) => post.id)).toEqual([postId]);
	});

	it('finds cards by ID and slug but never posts', async () => {
		const byId =
			(id: string) =>
			(runtime: typeof harness.runtime, event: ReturnType<typeof apiRequest>) =>
				cardEndpoint(runtime, event, id);
		const bySlug =
			(slug: string) =>
			(runtime: typeof harness.runtime, event: ReturnType<typeof apiRequest>) =>
				cardBySlugEndpoint(runtime, event, 'en', slug);

		expect((await call(byId(chairId), `/cards/${chairId}`)).body.data.type.key).toBe('chair');
		expect((await call(bySlug('oak-chair'), '/cards/by-slug/en/oak-chair')).body.data.id).toBe(
			chairId
		);
		expect((await call(byId(postId), `/cards/${postId}`)).status).toBe(404);
		expect(
			(
				await call(
					(runtime, event) => postEndpoint(runtime, event, lampId),
					`/posts/${lampId}`
				)
			).status
		).toBe(404);
	});

	it('filters by type and by shared fields', async () => {
		expect(await cardIds('/cards?type=chair&sort=published_at&order=asc')).toEqual([
			chairId,
			stoolId
		]);
		expect(await cardIds('/cards?type=chair&field[availability]=preorder')).toEqual([chairId]);
		expect(
			(await cardIds('/cards?type=chair&field[availability]=preorder,in_stock')).sort()
		).toEqual([chairId, stoolId].sort());
		expect(await cardIds('/cards?type=chair&field[price][min]=50')).toEqual([chairId]);
		expect(await cardIds('/cards?type=chair&field[price][max]=35')).toEqual([stoolId]);
		expect(await cardIds('/cards?type=chair&field[price]=120')).toEqual([chairId]);
		expect(await cardIds('/cards?type=lamp&field[featured]=true')).toEqual([lampId]);
		expect(await cardIds('/cards?type=chair&field[featured]=false&order=asc')).toEqual([
			chairId,
			stoolId
		]);
		expect(await cardIds('/cards?type=chair&field[released][min]=2026-06-01')).toEqual([
			chairId
		]);
	});

	it('sorts by a shared field with empty values last', async () => {
		expect(await cardIds('/cards?type=chair&sort=field.price&order=asc')).toEqual([
			stoolId,
			chairId
		]);
		expect(await cardIds('/cards?type=chair&sort=field.price&order=desc')).toEqual([
			chairId,
			stoolId
		]);
		expect(await cardIds('/cards?type=chair&sort=field.released&order=asc')).toEqual([
			chairId,
			stoolId
		]);
		expect(await cardIds('/cards?type=chair&sort=field.released&order=desc')).toEqual([
			chairId,
			stoolId
		]);
	});

	it('refuses field filters it cannot apply', async () => {
		expect(await rejected('/cards?field[price][min]=10')).toContain('"type"');
		expect(await rejected('/cards?sort=field.price')).toContain('"type"');
		expect(await rejected('/cards?type=sofa')).toContain('does not exist');
		expect(await rejected('/cards?type=chair&field[color]=red')).toContain('no field "color"');
		expect(await rejected('/cards?type=chair&field[tagline]=x')).toContain(
			'cannot be filtered'
		);
		expect(await rejected('/cards?type=chair&field[details]=x')).toContain(
			'cannot be filtered'
		);
		expect(await rejected('/cards?type=chair&field[price][min]=cheap')).toContain(
			'must be a number'
		);
		expect(await rejected('/cards?type=chair&field[availability]=sold')).toContain(
			'not an option'
		);
		expect(await rejected('/cards?type=chair&field[availability][min]=a')).toContain('ranges');
		expect(await rejected('/cards?type=chair&field[featured]=yes')).toContain('true or false');
		expect(await rejected('/cards?type=chair&field[released][max]=June')).toContain('date');
		expect(await rejected('/cards?type=chair&field[price][avg]=1')).toContain('Unknown');
		expect(
			await rejected('/cards?type=chair&field[price][min]=1&field[price][min]=2')
		).toContain('only appear once');
		expect(await rejected('/cards?sort=price')).toContain('field.<key>');
		expect(await rejected('/cards?author=x')).toContain('Unknown query parameter "author"');
	});

	it('lists card types with their fields', async () => {
		const { status, body } = await call(cardTypesEndpoint, '/card-types');

		expect(status).toBe(200);
		expect(body.data.map((type: { key: string }) => type.key)).toEqual(['chair', 'lamp']);
		expect(body.data[0].fields.map((field: { key: string }) => field.key)).toEqual([
			'sku',
			'price',
			'sale_price',
			'stock',
			'availability',
			'brand',
			'details',
			'tagline',
			'featured',
			'released'
		]);
		expect(body.data[0].fields[1]).toMatchObject({
			kind: 'price',
			required: true,
			currency: 'USD'
		});
	});
});
