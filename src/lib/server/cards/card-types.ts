import { and, asc, eq, ne } from 'drizzle-orm';
import { recordAuditEntry } from '../audit/audit-log';
import type { AuthUser } from '../auth/auth';
import type { AuthRequest } from '../auth/auth-request.interfaces';
import type { AppDatabase, DatabaseExecutor } from '../db';
import { cardTypes } from '../db/schema';
import { requirePermission } from '../permissions/permissions';
import type { Runtime } from '../runtime.interfaces';
import { parseStoredCardFields } from './card-fields';
import type {
	CardTypeDeleteResult,
	CardTypeInput,
	CardTypeSaveResult,
	CardTypeView
} from './card-types.interfaces';

type CardTypeRow = typeof cardTypes.$inferSelect;

export function listCardTypes(db: AppDatabase): CardTypeView[] {
	return db.select().from(cardTypes).orderBy(asc(cardTypes.name)).all().map(toView);
}

export function findCardType(db: DatabaseExecutor, id: string): CardTypeView | null {
	const row = db.select().from(cardTypes).where(eq(cardTypes.id, id)).get();

	if (row === undefined) {
		return null;
	}

	return toView(row);
}

export function createCardType(
	runtime: Runtime,
	request: AuthRequest,
	actor: AuthUser,
	input: CardTypeInput
): CardTypeSaveResult {
	requirePermission(actor, 'card_type.manage', null);

	if (keyTaken(runtime.db, input.key, null)) {
		return { status: 'key_taken' };
	}

	const id = crypto.randomUUID();

	runtime.db.transaction((tx) => {
		tx.insert(cardTypes)
			.values({
				id,
				key: input.key,
				name: input.name,
				fieldsJson: JSON.stringify(input.fields)
			})
			.run();
		audit(tx, request, actor, 'card_type.created', id, input);
	});

	return { status: 'saved', id };
}

export function updateCardType(
	runtime: Runtime,
	request: AuthRequest,
	actor: AuthUser,
	id: string,
	input: CardTypeInput
): CardTypeSaveResult {
	requirePermission(actor, 'card_type.manage', null);

	if (findCardType(runtime.db, id) === null) {
		return { status: 'not_found' };
	}

	if (keyTaken(runtime.db, input.key, id)) {
		return { status: 'key_taken' };
	}

	runtime.db.transaction((tx) => {
		tx.update(cardTypes)
			.set({
				key: input.key,
				name: input.name,
				fieldsJson: JSON.stringify(input.fields),
				updatedAt: new Date()
			})
			.where(eq(cardTypes.id, id))
			.run();
		audit(tx, request, actor, 'card_type.updated', id, input);
	});

	return { status: 'saved', id };
}

export function deleteCardType(
	runtime: Runtime,
	request: AuthRequest,
	actor: AuthUser,
	id: string
): CardTypeDeleteResult {
	requirePermission(actor, 'card_type.manage', null);

	const cardType = findCardType(runtime.db, id);

	if (cardType === null) {
		return 'not_found';
	}

	runtime.db.transaction((tx) => {
		tx.delete(cardTypes).where(eq(cardTypes.id, id)).run();
		audit(tx, request, actor, 'card_type.deleted', id, cardType);
	});

	return 'deleted';
}

function toView(row: CardTypeRow): CardTypeView {
	return {
		id: row.id,
		key: row.key,
		name: row.name,
		fields: parseStoredCardFields(row.fieldsJson),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

function keyTaken(db: DatabaseExecutor, key: string, exceptId: string | null): boolean {
	let condition = eq(cardTypes.key, key);

	if (exceptId !== null) {
		condition = and(condition, ne(cardTypes.id, exceptId)) ?? condition;
	}

	return db.select({ id: cardTypes.id }).from(cardTypes).where(condition).get() !== undefined;
}

function audit(
	tx: DatabaseExecutor,
	request: AuthRequest,
	actor: AuthUser,
	action: 'card_type.created' | 'card_type.updated' | 'card_type.deleted',
	id: string,
	input: Pick<CardTypeInput, 'key' | 'name' | 'fields'>
): void {
	recordAuditEntry(tx, {
		actorType: 'user',
		actorId: actor.id,
		action,
		targetType: 'card_type',
		targetId: id,
		details: {
			key: input.key,
			name: input.name,
			fields: input.fields.map((field) => field.key)
		},
		ip: request.ip,
		userAgent: request.userAgent
	});
}
