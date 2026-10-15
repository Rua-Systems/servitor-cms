import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { PANEL_ROUTES } from '$lib/constants/routes';
import { requireActor } from '$lib/server/auth/actor';
import { createAuthRequest } from '$lib/server/auth/auth-request';
import { readCardTypeUpdate } from '$lib/server/cards/card-type-form';
import { deleteCardType, findCardType, updateCardType } from '$lib/server/cards/card-types';
import { readFormFields } from '$lib/server/http/form';
import { defaultLanguageCode } from '$lib/server/languages/languages';
import { requirePermission } from '$lib/server/permissions/permissions';
import { getRuntime } from '$lib/server/runtime';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

const cardTypeIdSchema = z.uuid();

function manager(event: Pick<RequestEvent, 'locals'>) {
	const { user } = requireActor(event.locals);

	requirePermission(user, 'card_type.manage', null);

	return user;
}

function cardTypeId(event: Pick<RequestEvent, 'params'>): string {
	const parsed = cardTypeIdSchema.safeParse(event.params.id);

	if (!parsed.success) {
		error(404, { message: 'Not found' });
	}

	return parsed.data;
}

export const load: PageServerLoad = (event) => {
	manager(event);

	const cardType = findCardType(getRuntime().db, cardTypeId(event));

	if (cardType === null) {
		error(404, { message: 'Not found' });
	}

	return { cardType };
};

export const actions: Actions = {
	update: async (event) => {
		const user = manager(event);
		const id = cardTypeId(event);
		const runtime = getRuntime();
		const parsed = readCardTypeUpdate(
			await readFormFields(event.request),
			defaultLanguageCode(runtime.db) ?? 'en'
		);

		if (parsed.status !== 'ok') {
			return fail(400, { error: parsed.error });
		}

		const result = updateCardType(runtime, createAuthRequest(event), user, id, parsed.input);

		if (result.status === 'not_found') {
			error(404, { message: 'Not found' });
		}

		if (result.status !== 'saved') {
			return fail(400, { error: result.status });
		}

		return { saved: true };
	},
	delete: (event) => {
		const user = manager(event);
		const result = deleteCardType(
			getRuntime(),
			createAuthRequest(event),
			user,
			cardTypeId(event)
		);

		if (result === 'not_found') {
			error(404, { message: 'Not found' });
		}

		redirect(303, PANEL_ROUTES.cardTypes);
	}
};
