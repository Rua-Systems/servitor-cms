import { describe, expect, it } from 'vitest';
import { emptyRow, fieldFromRow, keyFromLabel, moveRow, rowFromField } from './card-field-rows';

describe('keyFromLabel', () => {
	it.each([
		['Sale price', 'sale_price'],
		['Stok Kodu (SKU)', 'stok_kodu_sku'],
		['Işık şiddeti', 'isik_siddeti'],
		['Größe', 'grosse'],
		['3D model', 'field_3d_model'],
		['商品', '']
	])('turns %s into %s', (label, key) => {
		expect(keyFromLabel(label)).toBe(key);
	});
});

describe('field rows', () => {
	it('round-trips a field and keeps only the settings of its kind', () => {
		const row = rowFromField({
			key: 'size',
			label: 'Size',
			kind: 'select',
			required: true,
			translatable: false,
			options: ['S', 'M'],
			currency: null
		});

		expect(fieldFromRow({ ...row, optionsText: ' S \n\nM\nL ' })).toEqual({
			key: 'size',
			label: 'Size',
			kind: 'select',
			required: true,
			translatable: false,
			options: ['S', 'M', 'L'],
			currency: null
		});
		expect(
			fieldFromRow({ ...row, kind: 'price', currency: 'try', translatable: true })
		).toMatchObject({ options: [], currency: 'TRY', translatable: false });
		expect(fieldFromRow({ ...row, kind: 'long_text', translatable: true })).toMatchObject({
			translatable: true,
			options: []
		});
	});

	it('moves rows within bounds', () => {
		const rows = [emptyRow(), emptyRow(), emptyRow()];
		const [first, second, third] = rows;

		expect(moveRow(rows, second.id, -1).map((row) => row.id)).toEqual([
			second.id,
			first.id,
			third.id
		]);
		expect(moveRow(rows, third.id, 1)).toBe(rows);
		expect(moveRow(rows, 'missing', 1)).toBe(rows);
	});
});
