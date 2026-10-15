import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { resolve } from '$app/paths';
import { requireActor } from '$lib/server/auth/actor';
import { listCardTypes } from '$lib/server/cards/card-types';
import { createCard } from '$lib/server/cards/cards';
import { readFormFields } from '$lib/server/http/form';
import { defaultLanguageCode, listContentLanguages } from '$lib/server/languages/languages';
import { readPageNumber } from '$lib/server/media/media-form';
import { can, requirePermission } from '$lib/server/permissions/permissions';
import { readLanguageCode } from '$lib/server/posts/post-form';
import { listPosts } from '$lib/server/posts/posts';
import { getRuntime } from '$lib/server/runtime';
import type { Actions, PageServerLoad } from './$types';

const cardTypeIdSchema = z.uuid();

export const load: PageServerLoad = ({ locals, url }) => {
	const { user } = requireActor(locals);

	requirePermission(user, 'post.list', null);

	const { db } = getRuntime();
	const canListAll = can(user, 'post.list_all', null);
	const showAll = canListAll && url.searchParams.get('scope') === 'all';

	return {
		cards: listPosts(db, user, showAll, readPageNumber(url.searchParams.get('page')), 'card'),
		cardTypes: listCardTypes(db).map((cardType) => ({ id: cardType.id, name: cardType.name })),
		canManageTypes: can(user, 'card_type.manage', null),
		showAll,
		canListAll,
		languages: listContentLanguages(db),
		defaultLanguage: defaultLanguageCode(db)
	};
};

export const actions: Actions = {
	create: async (event) => {
		const { user } = requireActor(event.locals);

		requirePermission(user, 'post.create', null);

		const fields = await readFormFields(event.request);
		const languageCode = readLanguageCode(fields.languageCode);
		const cardTypeId = cardTypeIdSchema.safeParse(fields.cardTypeId);

		if (!cardTypeId.success) {
			return fail(400, { error: 'unknown_card_type' as const });
		}

		if (languageCode === null) {
			return fail(400, { error: 'unknown_language' as const });
		}

		const result = createCard(getRuntime(), user, cardTypeId.data, languageCode);

		if (result.status !== 'created') {
			return fail(400, { error: result.status });
		}

		redirect(303, resolve(`/panel/posts/${result.postId}/${result.languageCode}`));
	}
};
