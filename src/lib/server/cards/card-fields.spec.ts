import { describe, expect, it } from 'vitest';
import { MAX_CARD_FIELDS } from '../../constants/cards';
import { parseStoredCardFields, validateCardFields } from './card-fields';

function raw(overrides: Record<string, unknown>) {
	return {
		key: 'sku',
		label: 'SKU',
		kind: 'text',
		required: false,
		translatable: false,
		options: [],
		currency: null,
		...overrides
	};
}

describe('validateCardFields', () => {
	it('accepts and normalizes every field kind', () => {
		const result = validateCardFields([
			raw({ key: 'title', label: ' Title ', translatable: true }),
			raw({ key: 'notes', kind: 'long_text', translatable: true }),
			raw({ key: 'stock', kind: 'number', translatable: true }),
			raw({ key: 'price', kind: 'price', currency: 'try', options: ['ignored'] }),
			raw({ key: 'size', kind: 'select', options: ['S', ' M ', 'S', ''] }),
			raw({ key: 'gift', kind: 'boolean' }),
			raw({ key: 'link', kind: 'url' }),
			raw({ key: 'released', kind: 'date', currency: 'EUR' })
		]);

		expect(result.status).toBe('ok');

		if (result.status !== 'ok') {
			return;
		}

		expect(result.fields.map((field) => field.kind)).toEqual([
			'text',
			'long_text',
			'number',
			'price',
			'select',
			'boolean',
			'url',
			'date'
		]);
		expect(result.fields[0].label).toBe('Title');
		expect(result.fields[0].translatable).toBe(true);
		expect(result.fields[2].translatable).toBe(false);
		expect(result.fields[3]).toMatchObject({ currency: 'TRY', options: [] });
		expect(result.fields[4].options).toEqual(['S', 'M']);
		expect(result.fields[7].currency).toBeNull();
	});

	it.each([
		['field_label_required', [raw({ label: ' ' })]],
		['invalid_field_key', [raw({ key: 'Price' })]],
		['invalid_field_key', [raw({ key: '1st' })]],
		['duplicate_field_key', [raw({}), raw({ label: 'Again' })]],
		['options_required', [raw({ kind: 'select', options: [' '] })]],
		['invalid_currency', [raw({ kind: 'price', currency: 'EURO' })]],
		['invalid_currency', [raw({ kind: 'price', currency: null })]],
		['invalid_input', [raw({ kind: 'colour' })]],
		['invalid_input', 'not a list']
	])('refuses with %s', (error, value) => {
		expect(validateCardFields(value)).toEqual({ status: 'invalid', error });
	});

	it('limits the number of fields', () => {
		const fields = Array.from({ length: MAX_CARD_FIELDS + 1 }, (_, index) =>
			raw({ key: `field_${index}` })
		);

		expect(validateCardFields(fields)).toEqual({ status: 'invalid', error: 'too_many_fields' });
	});
});

describe('parseStoredCardFields', () => {
	it('reads stored definitions and drops anything it cannot trust', () => {
		expect(parseStoredCardFields(JSON.stringify([raw({})]))).toHaveLength(1);
		expect(parseStoredCardFields('{')).toEqual([]);
		expect(parseStoredCardFields(JSON.stringify([raw({ key: 'Bad' })]))).toEqual([]);
	});
});
