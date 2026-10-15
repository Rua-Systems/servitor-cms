export type CardValuesResult<Values> =
	{ status: 'ok'; values: Values } | { status: 'invalid'; key: string };
