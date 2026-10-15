import { describe, expect, it } from 'vitest';
import type { CardFieldDefinition } from '../../modules/interfaces/cards.interfaces';
import {
	missingCardFields,
	parseStoredCardValues,
	parseStoredTranslatedValues,
	readRawCardValues,
	readSharedCardValues,
	readTranslatedCardValues,
	serializeCardValues
} from './card-values';

function field(
	key: string,
	kind: CardFieldDefinition['kind'],
	extra: Partial<CardFieldDefinition> = {}
): CardFieldDefinition {
	return {
		key,
		label: key,
		kind,
		required: false,
		translatable: false,
		options: [],
		currency: null,
		...extra
	};
}

const FIELDS: CardFieldDefinition[] = [
	field('sku', 'text', { required: true }),
	field('notes', 'long_text'),
	field('stock', 'number'),
	field('price', 'price', { required: true, currency: 'USD' }),
	field('size', 'select', { options: ['S', 'M'] }),
	field('gift', 'boolean', { required: true }),
	field('link', 'url'),
	field('released', 'date'),
	field('tagline', 'text', { translatable: true, required: true })
];

describe('readRawCardValues', () => {
	it('collects the card fields of a form', () => {
		expect(readRawCardValues({ 'card:sku': 'A1', title: 'x', 'card:gift': 'on' })).toEqual({
			sku: 'A1',
			gift: 'on'
		});
	});
});

describe('readSharedCardValues', () => {
	it('turns form values into typed values and leaves out empty ones', () => {
		expect(
			readSharedCardValues(FIELDS, {
				sku: ' A1 ',
				notes: 'line one\r\nline two',
				stock: '12',
				price: '19,999',
				size: 'M',
				gift: 'on',
				link: 'https://example.com/a',
				released: '2026-02-28',
				tagline: 'translated fields are ignored here'
			})
		).toEqual({
			status: 'ok',
			values: {
				sku: 'A1',
				notes: 'line one\nline two',
				stock: 12,
				price: 20,
				size: 'M',
				gift: true,
				link: 'https://example.com/a',
				released: '2026-02-28'
			}
		});
		expect(readSharedCardValues(FIELDS, {})).toEqual({ status: 'ok', values: { gift: false } });
	});

	it.each([
		['stock', { stock: 'many' }],
		['price', { price: '-1' }],
		['size', { size: 'XL' }],
		['link', { link: 'javascript:alert(1)' }],
		['link', { link: 'not a url' }],
		['released', { released: '2026-02-30' }],
		['sku', { sku: 'x'.repeat(501) }]
	])('refuses an invalid %s', (key, raw) => {
		expect(readSharedCardValues(FIELDS, raw)).toEqual({ status: 'invalid', key });
	});
});

describe('readTranslatedCardValues', () => {
	it('keeps only the fields with a separate value per language', () => {
		expect(readTranslatedCardValues(FIELDS, { tagline: ' Hello ', sku: 'A1' })).toEqual({
			status: 'ok',
			values: { tagline: 'Hello' }
		});
	});
});

describe('missingCardFields', () => {
	it('lists required fields without a value, including unchecked required checkboxes', () => {
		expect(missingCardFields(FIELDS, { sku: 'A1', gift: false }, {})).toEqual([
			'price',
			'gift',
			'tagline'
		]);
		expect(
			missingCardFields(FIELDS, { sku: 'A1', price: 0, gift: true }, { tagline: 'Hi' })
		).toEqual([]);
	});
});

describe('stored values', () => {
	it('reads back what was stored and ignores anything else', () => {
		const json = serializeCardValues({ stock: 2, sku: 'A1', gift: true });

		expect(json).toBe('{"gift":true,"sku":"A1","stock":2}');
		expect(parseStoredCardValues(json)).toEqual({ stock: 2, sku: 'A1', gift: true });
		expect(parseStoredCardValues('{"nested":{"a":1},"list":[1]}')).toEqual({});
		expect(parseStoredCardValues('[1]')).toEqual({});
		expect(parseStoredTranslatedValues('{"tagline":"Hi","stock":2}')).toEqual({
			tagline: 'Hi'
		});
	});
});
