export const CARD_FIELD_KINDS = [
	'text',
	'long_text',
	'number',
	'price',
	'select',
	'boolean',
	'url',
	'date'
] as const;

export type CardFieldKind = (typeof CARD_FIELD_KINDS)[number];

export const TRANSLATABLE_CARD_FIELD_KINDS: readonly CardFieldKind[] = ['text', 'long_text'];

export const CARD_TYPE_PRESETS = ['blank', 'product'] as const;

export type CardTypePreset = (typeof CARD_TYPE_PRESETS)[number];

export const CARD_TYPE_NAME_MAX_LENGTH = 80;

export const CARD_TYPE_KEY_MAX_LENGTH = 50;

export const CARD_TYPE_KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export const MAX_CARD_FIELDS = 40;

export const CARD_FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

export const CARD_DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export const CARD_FIELD_LABEL_MAX_LENGTH = 80;

export const MAX_CARD_FIELD_OPTIONS = 50;

export const CARD_FIELD_OPTION_MAX_LENGTH = 80;

export const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export const DEFAULT_CARD_CURRENCY = 'USD';

export const MAX_CARD_GALLERY_IMAGES = 20;

export const CARD_TEXT_MAX_LENGTH = 500;

export const CARD_LONG_TEXT_MAX_LENGTH = 5_000;

export const CARD_URL_MAX_LENGTH = 2_048;

export const CARD_VALUE_FIELD_PREFIX = 'card:';
