import { asc, eq } from 'drizzle-orm';
import { MAX_CARD_GALLERY_IMAGES } from '../../constants/cards';
import type { AuthUser } from '../auth/auth';
import type { DatabaseExecutor } from '../db';
import { postGallery, posts } from '../db/schema';
import { unusableMediaIds } from '../media/media-library';
import { requirePermission } from '../permissions/permissions';
import {
	createTranslationRow,
	findPost,
	isEnabledLanguage,
	postSettingsLocked,
	postSubject
} from '../posts/posts';
import type { PostRecord, TranslationDraftInput } from '../posts/posts.interfaces';
import type { PublishRequirementStatus } from '../posts/publish-requirements.interfaces';
import type { Runtime } from '../runtime.interfaces';
import { findCardType } from './card-types';
import {
	missingCardFields,
	parseStoredCardValues,
	readSharedCardValues,
	readTranslatedCardValues,
	serializeCardValues
} from './card-values';
import type {
	CardCreateResult,
	CardDetails,
	CardSettingsInput,
	CardSettingsResult
} from './cards.interfaces';

export function createCard(
	runtime: Runtime,
	actor: AuthUser,
	cardTypeId: string,
	languageCode: string
): CardCreateResult {
	requirePermission(actor, 'post.create', null);

	if (findCardType(runtime.db, cardTypeId) === null) {
		return { status: 'unknown_card_type' };
	}

	if (!isEnabledLanguage(runtime.db, languageCode)) {
		return { status: 'unknown_language' };
	}

	const postId = crypto.randomUUID();

	runtime.db.transaction((tx) => {
		tx.insert(posts).values({ id: postId, ownerId: actor.id, cardTypeId }).run();
		createTranslationRow(tx, postId, languageCode, actor.id);
	});

	return { status: 'created', postId, languageCode };
}

export function findCardDetails(db: DatabaseExecutor, post: PostRecord): CardDetails | null {
	if (post.cardTypeId === null) {
		return null;
	}

	const cardType = findCardType(db, post.cardTypeId);
	const row = db
		.select({ valuesJson: posts.cardValuesJson })
		.from(posts)
		.where(eq(posts.id, post.id))
		.get();

	if (cardType === null || row === undefined) {
		return null;
	}

	return {
		type: { id: cardType.id, key: cardType.key, name: cardType.name, fields: cardType.fields },
		values: parseStoredCardValues(row.valuesJson),
		galleryMediaIds: galleryMediaIds(db, post.id)
	};
}

export function galleryMediaIds(db: DatabaseExecutor, postId: string): string[] {
	return db
		.select({ mediaId: postGallery.mediaId })
		.from(postGallery)
		.where(eq(postGallery.postId, postId))
		.orderBy(asc(postGallery.position))
		.all()
		.map((row) => row.mediaId);
}

export function updateCardSettings(
	runtime: Runtime,
	actor: AuthUser,
	postId: string,
	input: CardSettingsInput
): CardSettingsResult {
	const post = findPost(runtime.db, postId);

	if (post === null) {
		return { status: 'not_found' };
	}

	requirePermission(actor, 'post.edit', postSubject(post));

	const current = findCardDetails(runtime.db, post);

	if (current === null) {
		return { status: 'not_found' };
	}

	const values = readSharedCardValues(current.type.fields, input.values);

	if (values.status !== 'ok') {
		return { status: 'invalid_card_value', key: values.key };
	}

	const gallery = [...new Set(input.galleryMediaIds)];

	if (gallery.length > MAX_CARD_GALLERY_IMAGES) {
		return { status: 'too_many_images' };
	}

	const added = gallery.filter((id) => !current.galleryMediaIds.includes(id));

	if (unusableMediaIds(runtime.db, actor, added).length > 0) {
		return { status: 'invalid_media' };
	}

	const valuesJson = serializeCardValues(values.values);
	const changed =
		valuesJson !== serializeCardValues(current.values) ||
		gallery.join(',') !== current.galleryMediaIds.join(',');

	if (changed && postSettingsLocked(runtime.db, actor, postId)) {
		return { status: 'locked' };
	}

	runtime.db.transaction((tx) => {
		tx.update(posts)
			.set({ cardValuesJson: valuesJson, updatedAt: new Date() })
			.where(eq(posts.id, postId))
			.run();
		tx.delete(postGallery).where(eq(postGallery.postId, postId)).run();

		if (gallery.length > 0) {
			tx.insert(postGallery)
				.values(gallery.map((mediaId, position) => ({ postId, mediaId, position })))
				.run();
		}
	});

	return { status: 'saved' };
}

export function cardPublishRequirement(
	db: DatabaseExecutor,
	post: PostRecord,
	input: TranslationDraftInput
): PublishRequirementStatus | null {
	if (input.title.trim() === '') {
		return 'title_required';
	}

	const details = findCardDetails(db, post);

	if (details === null) {
		return null;
	}

	const translated = readTranslatedCardValues(details.type.fields, input.cardValues);

	if (translated.status !== 'ok') {
		return null;
	}

	if (missingCardFields(details.type.fields, details.values, translated.values).length > 0) {
		return 'card_fields_required';
	}

	return null;
}
