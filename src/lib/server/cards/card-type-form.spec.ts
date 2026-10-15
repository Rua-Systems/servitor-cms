import { describe, expect, it } from 'vitest';
import { readCardTypeUpdate, readNewCardType } from './card-type-form';

describe('readNewCardType', () => {
	it('creates the key from the name and starts from the chosen preset', () => {
		const result = readNewCardType({ name: 'Summer Shoes', key: '', preset: 'product' }, 'en');

		expect(result.status).toBe('ok');

		if (result.status !== 'ok') {
			return;
		}

		expect(result.input.key).toBe('summer-shoes');
		expect(result.input.fields.map((field) => field.key)).toEqual([
			'sku',
			'price',
			'sale_price',
			'stock',
			'availability',
			'brand',
			'details'
		]);
		expect(result.input.fields.find((field) => field.key === 'price')).toMatchObject({
			kind: 'price',
			required: true,
			currency: 'USD'
		});
	});

	it('keeps a requested key and starts empty without a preset', () => {
		expect(readNewCardType({ name: 'Events', key: 'Event-List' }, 'en')).toEqual({
			status: 'ok',
			input: { key: 'event-list', name: 'Events', fields: [] }
		});
	});

	it('falls back to the preset name when the name has no Latin letters', () => {
		const result = readNewCardType({ name: '商品', key: '', preset: 'product' }, 'ja');

		expect(result.status === 'ok' && result.input.key).toBe('product');
	});

	it.each([
		['name_required', { name: ' ', key: '' }],
		['invalid_key', { name: 'Events', key: 'events!' }],
		['invalid_key', { name: '商品', key: '' }],
		['invalid_input', { name: 'Events', key: '', preset: 'service' }]
	])('refuses with %s', (error, fields) => {
		expect(readNewCardType(fields, 'ja')).toEqual({ status: 'invalid', error });
	});
});

describe('readCardTypeUpdate', () => {
	it('reads the field list from JSON', () => {
		const fields = JSON.stringify([
			{
				key: 'color',
				label: 'Color',
				kind: 'select',
				required: true,
				translatable: false,
				options: ['Red', 'Blue'],
				currency: null
			}
		]);

		expect(readCardTypeUpdate({ name: 'Shirts', key: 'shirts', fields }, 'en')).toEqual({
			status: 'ok',
			input: {
				key: 'shirts',
				name: 'Shirts',
				fields: [
					{
						key: 'color',
						label: 'Color',
						kind: 'select',
						required: true,
						translatable: false,
						options: ['Red', 'Blue'],
						currency: null
					}
				]
			}
		});
	});

	it('refuses broken JSON and invalid fields', () => {
		expect(readCardTypeUpdate({ name: 'Shirts', key: 'shirts', fields: '[' }, 'en')).toEqual({
			status: 'invalid',
			error: 'invalid_input'
		});
		expect(
			readCardTypeUpdate(
				{
					name: 'Shirts',
					key: 'shirts',
					fields: JSON.stringify([
						{
							key: 'price',
							label: 'Price',
							kind: 'price',
							required: true,
							translatable: false,
							options: [],
							currency: ''
						}
					])
				},
				'en'
			)
		).toEqual({ status: 'invalid', error: 'invalid_currency' });
	});
});
