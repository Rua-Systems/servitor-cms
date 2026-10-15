import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AuthUser } from '../auth/auth';
import { postTranslations, webhookDeliveries, webhooks } from '../db/schema';
import { ensureDefaultContentLanguage } from '../languages/languages';
import { createLogger } from '../logging/logger';
import { uploadMedia } from '../media/media-library';
import { findPost, listPosts } from '../posts/posts';
import { listPublicPosts } from '../public/public-posts';
import { TestCookieJar } from '../testing/cookie-jar';
import { imageFile, pngImage } from '../testing/images';
import { createTestPost, paragraphs, publishTestDraft, requireTranslation } from '../testing/posts';
import { createTestRuntime } from '../testing/runtime';
import { presetCardFields } from './card-type-presets';
import { createCardType, deleteCardType } from './card-types';
import { createCard, findCardDetails, updateCardSettings } from './cards';

const PASSWORD = 'Kx7-quiet-harbor-19';

let harness: ReturnType<typeof createTestRuntime>;

let cardTypeId: string;

beforeEach(async () => {
	harness = createTestRuntime();
	ensureDefaultContentLanguage(harness.runtime.db, harness.runtime.env, createLogger('silent'));
	await harness.createUser({ email: 'admin@example.com', password: PASSWORD, role: 'admin' });
	await harness.createUser({ email: 'author@example.com', password: PASSWORD, role: 'author' });

	const created = createCardType(harness.runtime, request(), await actor('admin@example.com'), {
		key: 'product',
		name: 'Product',
		fields: [
			...presetCardFields('product'),
			{
				key: 'tagline',
				label: 'Tagline',
				kind: 'text',
				required: true,
				translatable: true,
				options: [],
				currency: null
			}
		]
	});

	if (created.status !== 'saved') {
		throw new Error('Expected the card type to be created');
	}

	cardTypeId = created.id;
});

afterEach(() => {
	harness.dispose();
});

async function actor(email: string): Promise<AuthUser> {
	return (await harness.signIn(email, PASSWORD)).actor;
}

function request() {
	return harness.request(new TestCookieJar());
}

function newCard(owner: AuthUser): string {
	const result = createCard(harness.runtime, owner, cardTypeId, 'en');

	if (result.status !== 'created') {
		throw new Error(`Expected the card to be created, got ${result.status}`);
	}

	return result.postId;
}

async function uploadImage(owner: AuthUser): Promise<string> {
	const result = await uploadMedia(
		harness.runtime,
		owner,
		imageFile(await pngImage(40, 30), 'a.png', 'image/png'),
		'library'
	);

	if (result.status !== 'uploaded') {
		throw new Error('Expected the upload to succeed');
	}

	return result.id;
}

function details(postId: string) {
	const post = findPost(harness.runtime.db, postId);

	if (post === null) {
		throw new Error('Expected the card to exist');
	}

	return findCardDetails(harness.runtime.db, post);
}

const VALID_VALUES = { price: '19.90', availability: 'in_stock', sku: 'A-1' };

describe('cards', () => {
	it('creates cards from a type and keeps them out of the post list', async () => {
		const admin = await actor('admin@example.com');
		const cardId = newCard(admin);
		const postId = createTestPost(harness.runtime, admin);

		expect(createCard(harness.runtime, admin, crypto.randomUUID(), 'en')).toEqual({
			status: 'unknown_card_type'
		});
		expect(createCard(harness.runtime, admin, cardTypeId, 'xx')).toEqual({
			status: 'unknown_language'
		});
		expect(listPosts(harness.runtime.db, admin, false, 1).items.map((item) => item.id)).toEqual(
			[postId]
		);
		expect(
			listPosts(harness.runtime.db, admin, false, 1, 'card').items.map((item) => ({
				id: item.id,
				type: item.cardTypeName
			}))
		).toEqual([{ id: cardId, type: 'Product' }]);
		expect(deleteCardType(harness.runtime, request(), admin, cardTypeId)).toBe('in_use');
	});

	it('saves shared values and an ordered gallery of own images', async () => {
		const author = await actor('author@example.com');
		const admin = await actor('admin@example.com');
		const cardId = newCard(author);
		const first = await uploadImage(author);
		const second = await uploadImage(author);
		const foreign = await uploadImage(admin);

		expect(
			updateCardSettings(harness.runtime, author, cardId, {
				values: { ...VALID_VALUES, stock: '3', tagline: 'ignored' },
				galleryMediaIds: [second, first, second]
			})
		).toEqual({ status: 'saved' });
		expect(details(cardId)).toMatchObject({
			type: { key: 'product' },
			values: { price: 19.9, availability: 'in_stock', sku: 'A-1', stock: 3 },
			galleryMediaIds: [second, first]
		});

		expect(
			updateCardSettings(harness.runtime, author, cardId, {
				values: { ...VALID_VALUES, availability: 'sold' },
				galleryMediaIds: []
			})
		).toEqual({ status: 'invalid_card_value', key: 'availability' });
		expect(
			updateCardSettings(harness.runtime, author, cardId, {
				values: VALID_VALUES,
				galleryMediaIds: [foreign]
			})
		).toEqual({ status: 'invalid_media' });
		expect(
			updateCardSettings(harness.runtime, author, cardId, {
				values: VALID_VALUES,
				galleryMediaIds: Array.from({ length: 21 }, () => crypto.randomUUID())
			})
		).toEqual({ status: 'too_many_images' });
	});

	it('locks shared values while a translation is live and changes need approval', async () => {
		const author = await actor('author@example.com');
		const cardId = newCard(author);
		const translation = requireTranslation(harness.runtime, cardId);

		harness.runtime.db
			.update(postTranslations)
			.set({
				status: 'published',
				slug: 'card',
				liveRevisionId: translation.workingRevisionId
			})
			.where(eq(postTranslations.id, translation.id))
			.run();

		expect(
			updateCardSettings(harness.runtime, author, cardId, {
				values: VALID_VALUES,
				galleryMediaIds: []
			})
		).toEqual({ status: 'locked' });
	});

	it('publishes once the title and every required field are filled in and announces a card event', async () => {
		const admin = await actor('admin@example.com');
		const cardId = newCard(admin);

		harness.runtime.db
			.insert(webhooks)
			.values({
				url: 'https://hooks.example.com',
				events: ['post.published', 'card.published'],
				enabled: true,
				secretCiphertext: 'test',
				createdBy: admin.id
			})
			.run();

		expect(
			publishTestDraft(harness.runtime, request(), admin, cardId, { title: '' }).status
		).toBe('title_required');
		expect(
			publishTestDraft(harness.runtime, request(), admin, cardId, {
				title: 'Red shoe',
				cardValues: { tagline: 'Light and fast' }
			}).status
		).toBe('card_fields_required');

		updateCardSettings(harness.runtime, admin, cardId, {
			values: VALID_VALUES,
			galleryMediaIds: []
		});

		expect(
			publishTestDraft(harness.runtime, request(), admin, cardId, {
				title: 'Red shoe',
				content: paragraphs(''),
				excerpt: '',
				metaDescription: null,
				cardValues: { tagline: '' }
			}).status
		).toBe('card_fields_required');
		expect(
			publishTestDraft(harness.runtime, request(), admin, cardId, {
				title: 'Red shoe',
				excerpt: '',
				metaDescription: null,
				cardValues: { tagline: 'Light and fast' }
			})
		).toEqual({ status: 'done', outcome: 'published' });

		const payloads = harness.runtime.db
			.select({ event: webhookDeliveries.event, payload: webhookDeliveries.payload })
			.from(webhookDeliveries)
			.all();

		expect(payloads.map((row) => row.event)).toEqual(['card.published']);
		expect(JSON.parse(payloads[0].payload)).toMatchObject({
			event: 'card.published',
			card_id: cardId,
			card_type: 'product'
		});
		expect(listPublicPosts(harness.runtime.db, 'en', 1)?.items ?? []).toEqual([]);
	});
});
