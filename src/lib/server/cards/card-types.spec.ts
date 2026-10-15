import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { auditLog } from '../db/schema';
import { ensureDefaultContentLanguage } from '../languages/languages';
import { createLogger } from '../logging/logger';
import { TestCookieJar } from '../testing/cookie-jar';
import { createTestRuntime } from '../testing/runtime';
import { presetCardFields } from './card-type-presets';
import {
	createCardType,
	deleteCardType,
	findCardType,
	listCardTypes,
	updateCardType
} from './card-types';

const PASSWORD = 'Kx7-quiet-harbor-19';

let harness: ReturnType<typeof createTestRuntime>;

beforeEach(async () => {
	harness = createTestRuntime();
	ensureDefaultContentLanguage(harness.runtime.db, harness.runtime.env, createLogger('silent'));
	await harness.createUser({ email: 'admin@example.com', password: PASSWORD, role: 'admin' });
	await harness.createUser({ email: 'author@example.com', password: PASSWORD, role: 'author' });
});

afterEach(() => {
	harness.dispose();
});

async function actor(email: string) {
	return (await harness.signIn(email, PASSWORD)).actor;
}

function request() {
	return harness.request(new TestCookieJar());
}

function auditActions(): string[] {
	return harness.runtime.db
		.select()
		.from(auditLog)
		.all()
		.map((row) => row.action)
		.filter((action) => action.startsWith('card_type.'));
}

describe('card types', () => {
	it('creates, lists, updates and deletes a type and records each change', async () => {
		const admin = await actor('admin@example.com');
		const created = createCardType(harness.runtime, request(), admin, {
			key: 'product',
			name: 'Product',
			fields: presetCardFields('product')
		});

		if (created.status !== 'saved') {
			throw new Error(`The card type was not saved: ${created.status}`);
		}

		expect(listCardTypes(harness.runtime.db).map((type) => type.key)).toEqual(['product']);
		expect(findCardType(harness.runtime.db, created.id)?.fields).toHaveLength(7);

		expect(
			updateCardType(harness.runtime, request(), admin, created.id, {
				key: 'goods',
				name: 'Goods',
				fields: []
			})
		).toEqual({ status: 'saved', id: created.id });
		expect(findCardType(harness.runtime.db, created.id)).toMatchObject({
			key: 'goods',
			name: 'Goods',
			fields: []
		});

		expect(deleteCardType(harness.runtime, request(), admin, created.id)).toBe('deleted');
		expect(listCardTypes(harness.runtime.db)).toEqual([]);
		expect(auditActions()).toEqual([
			'card_type.created',
			'card_type.updated',
			'card_type.deleted'
		]);
	});

	it('keeps keys unique', async () => {
		const admin = await actor('admin@example.com');
		const input = { key: 'event', name: 'Event', fields: [] };
		const first = createCardType(harness.runtime, request(), admin, input);
		const second = createCardType(harness.runtime, request(), admin, {
			...input,
			key: 'talk'
		});

		expect(createCardType(harness.runtime, request(), admin, input)).toEqual({
			status: 'key_taken'
		});

		if (second.status !== 'saved' || first.status !== 'saved') {
			throw new Error('Expected both types to be saved');
		}

		expect(updateCardType(harness.runtime, request(), admin, second.id, input)).toEqual({
			status: 'key_taken'
		});
		expect(updateCardType(harness.runtime, request(), admin, first.id, input)).toEqual({
			status: 'saved',
			id: first.id
		});
	});

	it('reports unknown types', async () => {
		const admin = await actor('admin@example.com');
		const missing = crypto.randomUUID();

		expect(
			updateCardType(harness.runtime, request(), admin, missing, {
				key: 'x',
				name: 'X',
				fields: []
			})
		).toEqual({ status: 'not_found' });
		expect(deleteCardType(harness.runtime, request(), admin, missing)).toBe('not_found');
	});

	it('lets only staff manage card types', async () => {
		const author = await actor('author@example.com');

		expect(() =>
			createCardType(harness.runtime, request(), author, { key: 'x', name: 'X', fields: [] })
		).toThrow();
	});
});
