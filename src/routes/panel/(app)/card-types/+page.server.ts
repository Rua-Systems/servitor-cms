import { fail, redirect } from '@sveltejs/kit';
import { PANEL_ROUTES } from '$lib/constants/routes';
import { requireActor } from '$lib/server/auth/actor';
import { createAuthRequest } from '$lib/server/auth/auth-request';
import { readNewCardType } from '$lib/server/cards/card-type-form';
import { createCardType, listCardTypes } from '$lib/server/cards/card-types';
import { readFormFields } from '$lib/server/http/form';
import { defaultLanguageCode } from '$lib/server/languages/languages';
import { requirePermission } from '$lib/server/permissions/permissions';
import { getRuntime } from '$lib/server/runtime';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	const { user } = requireActor(locals);

	requirePermission(user, 'card_type.manage', null);

	return { cardTypes: listCardTypes(getRuntime().db) };
};

export const actions: Actions = {
	create: async (event) => {
		const { user } = requireActor(event.locals);

		requirePermission(user, 'card_type.manage', null);

		const runtime = getRuntime();
		const parsed = readNewCardType(
			await readFormFields(event.request),
			defaultLanguageCode(runtime.db) ?? 'en'
		);

		if (parsed.status !== 'ok') {
			return fail(400, { error: parsed.error });
		}

		const result = createCardType(runtime, createAuthRequest(event), user, parsed.input);

		if (result.status !== 'saved') {
			return fail(400, { error: result.status });
		}

		redirect(303, `${PANEL_ROUTES.cardTypes}/${result.id}?created`);
	}
};
