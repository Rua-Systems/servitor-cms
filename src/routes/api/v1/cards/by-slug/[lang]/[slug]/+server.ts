import { cardBySlugEndpoint } from '$lib/server/api/api-endpoints';
import { getRuntime } from '$lib/server/runtime';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) =>
	cardBySlugEndpoint(getRuntime(), event, event.params.lang, event.params.slug);
