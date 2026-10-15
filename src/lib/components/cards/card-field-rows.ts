import { DEFAULT_CARD_CURRENCY, TRANSLATABLE_CARD_FIELD_KINDS } from '$lib/constants/cards';
import type { CardFieldDefinition } from '$lib/modules/interfaces/cards.interfaces';
import type { CardFieldRow } from './card-field-builder.interfaces';

const MAX_KEY_LENGTH = 40;

export function rowFromField(field: CardFieldDefinition): CardFieldRow {
	return {
		id: crypto.randomUUID(),
		key: field.key,
		keyEdited: true,
		label: field.label,
		kind: field.kind,
		required: field.required,
		translatable: field.translatable,
		optionsText: field.options.join('\n'),
		currency: field.currency ?? DEFAULT_CARD_CURRENCY
	};
}

export function emptyRow(): CardFieldRow {
	return {
		id: crypto.randomUUID(),
		key: '',
		keyEdited: false,
		label: '',
		kind: 'text',
		required: false,
		translatable: false,
		optionsText: '',
		currency: DEFAULT_CARD_CURRENCY
	};
}

export function fieldFromRow(row: CardFieldRow): CardFieldDefinition {
	let options: string[] = [];
	let currency: string | null = null;

	if (row.kind === 'select') {
		options = row.optionsText
			.split('\n')
			.map((option) => option.trim())
			.filter((option) => option !== '');
	}

	if (row.kind === 'price') {
		currency = row.currency.trim().toUpperCase();
	}

	return {
		key: row.key.trim(),
		label: row.label.trim(),
		kind: row.kind,
		required: row.required,
		translatable: row.translatable && TRANSLATABLE_CARD_FIELD_KINDS.includes(row.kind),
		options,
		currency
	};
}

export function keyFromLabel(label: string): string {
	const key = label
		.toLocaleLowerCase('en')
		.replaceAll('ı', 'i')
		.replaceAll('ß', 'ss')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');

	if (key === '') {
		return '';
	}

	if (/^[0-9]/.test(key)) {
		return `field_${key}`.slice(0, MAX_KEY_LENGTH);
	}

	return key.slice(0, MAX_KEY_LENGTH);
}

export function moveRow(rows: CardFieldRow[], id: string, offset: number): CardFieldRow[] {
	const index = rows.findIndex((row) => row.id === id);
	const target = index + offset;

	if (index < 0 || target < 0 || target >= rows.length) {
		return rows;
	}

	const next = [...rows];
	const [row] = next.splice(index, 1);

	next.splice(target, 0, row);

	return next;
}
