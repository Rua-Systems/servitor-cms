import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER, migrateDatabase, openDatabase, type AppDatabase } from './index';
import { user, webhookDeliveries, webhookDeliveryAttempts, webhooks } from './schema';

const TEST_DATA_ROOT = resolve('.tmp', 'tests');

const CARD_EVENTS_MIGRATION = '0007_card_webhook_events';

interface JournalEntry {
	idx: number;
	tag: string;
}

let directory: string;
let db: AppDatabase;

beforeEach(() => {
	mkdirSync(TEST_DATA_ROOT, { recursive: true });
	directory = mkdtempSync(join(TEST_DATA_ROOT, 'migration-'));
	db = openDatabase(join(directory, 'test.db'));
});

afterEach(() => {
	db.$client.close();
	rmSync(directory, { recursive: true, force: true });
});

function migrationsBefore(tag: string): string {
	const folder = join(directory, 'drizzle');
	const journal = JSON.parse(
		readFileSync(join(MIGRATIONS_FOLDER, 'meta', '_journal.json'), 'utf8')
	);
	const cut = journal.entries.findIndex((entry: JournalEntry) => entry.tag === tag);
	const entries = journal.entries.slice(0, cut);

	mkdirSync(join(folder, 'meta'), { recursive: true });
	writeFileSync(join(folder, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries }));

	for (const entry of entries) {
		copyFileSync(join(MIGRATIONS_FOLDER, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`));
	}

	return folder;
}

describe('the card webhook events migration', () => {
	it('keeps deliveries and their attempts while it allows card events', () => {
		migrateDatabase(db, migrationsBefore(CARD_EVENTS_MIGRATION));

		const userId = crypto.randomUUID();
		const webhookId = crypto.randomUUID();
		const deliveryId = crypto.randomUUID();

		db.insert(user)
			.values({ id: userId, name: 'Founder', email: 'founder@example.com', role: 'founder' })
			.run();
		db.insert(webhooks)
			.values({
				id: webhookId,
				url: 'https://hooks.example.com',
				events: ['post.published'],
				secretCiphertext: 'test',
				createdBy: userId
			})
			.run();
		db.insert(webhookDeliveries)
			.values({ id: deliveryId, webhookId, event: 'post.published', payload: '{}' })
			.run();
		db.insert(webhookDeliveryAttempts)
			.values({ deliveryId, statusCode: 500, durationMs: 12 })
			.run();

		migrateDatabase(db, MIGRATIONS_FOLDER);

		expect(
			db
				.select()
				.from(webhookDeliveries)
				.all()
				.map((row) => row.id)
		).toEqual([deliveryId]);
		expect(
			db
				.select()
				.from(webhookDeliveryAttempts)
				.all()
				.map((row) => [row.deliveryId, row.statusCode])
		).toEqual([[deliveryId, 500]]);

		db.insert(webhookDeliveries)
			.values({ webhookId, event: 'card.published', payload: '{}' })
			.run();

		expect(db.select().from(webhookDeliveries).all()).toHaveLength(2);
	});
});
