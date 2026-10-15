import { and, eq, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm';
import type { PostKind } from '../posts/posts.interfaces';
import type { DatabaseExecutor } from '../db';
import { contentLanguages, postTranslations, posts } from '../db/schema';

function kindRule(kind: PostKind): SQL {
	if (kind === 'card') {
		return isNotNull(posts.cardTypeId);
	}

	return isNull(posts.cardTypeId);
}

function visibilityRule(kind: PostKind): SQL {
	const rule = and(
		kindRule(kind),
		eq(posts.hiddenByModerator, false),
		eq(postTranslations.status, 'published'),
		isNotNull(postTranslations.liveRevisionId),
		eq(contentLanguages.enabled, true)
	);

	if (rule === undefined) {
		throw new Error('The public visibility rule is empty');
	}

	return rule;
}

export function publiclyVisible(db: DatabaseExecutor, kind: PostKind = 'post'): SQL {
	const visible = db
		.select({ id: postTranslations.id })
		.from(postTranslations)
		.innerJoin(posts, eq(posts.id, postTranslations.postId))
		.innerJoin(contentLanguages, eq(contentLanguages.code, postTranslations.languageCode))
		.where(visibilityRule(kind));

	return inArray(postTranslations.id, visible);
}
