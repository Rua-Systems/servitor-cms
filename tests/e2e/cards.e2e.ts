import { expect, test } from '@playwright/test';
import { authorPage } from './posts-support';
import { newClient } from './support';

test('staff create a card type from the product structure and change its fields', async ({
	browser
}) => {
	const founder = await newClient(browser, true);
	const name = `Shoes ${Date.now()}`;

	await founder.goto('/panel/card-types');
	await founder.getByLabel('Name').fill(name);
	await founder.getByLabel('Start from').selectOption('product');
	await founder.getByRole('button', { name: 'Create card type' }).click();

	await expect(founder).toHaveURL(/\/panel\/card-types\/[0-9a-f-]{36}\?created$/);
	await expect(founder.getByText('The card type was saved.')).toBeVisible();
	await expect(founder.getByLabel('Key', { exact: true }).first()).toHaveValue(/^shoes-[0-9]+$/);

	const fields = founder.getByTestId('card-field-list').locator(':scope > li');

	await expect(fields).toHaveCount(7);

	await founder.getByRole('button', { name: 'Add field' }).click();
	await expect(fields).toHaveCount(8);

	const added = fields.last();

	await added.getByLabel('Label').fill('Shoe size');
	await expect(added.getByLabel('Key')).toHaveValue('shoe_size');
	await added.getByLabel('Type').selectOption('select');
	await added.getByLabel('Options').fill('40\n41\n42');
	await added.getByLabel('Required').check();
	await founder.getByRole('button', { name: 'Save card type' }).click();

	await expect(founder.getByText('The card type was saved.')).toBeVisible();
	await founder.reload();
	await expect(fields).toHaveCount(8);
	await expect(fields.last().getByLabel('Options')).toHaveValue('40\n41\n42');

	await fields.first().getByLabel('Key').fill('Bad Key');
	await founder.getByRole('button', { name: 'Save card type' }).click();
	await expect(
		founder.getByText('Field keys start with a lowercase letter', { exact: false })
	).toBeVisible();

	await founder.goto('/panel/card-types');
	await expect(founder.getByTestId('card-type-list')).toContainText(name);
	await expect(founder.getByTestId('card-type-list')).toContainText('8 fields');
});

test('authors cannot manage card types', async ({ browser }) => {
	const author = await authorPage(browser, 'card-type-author');

	await expect(author.getByRole('link', { name: 'Card types' })).toHaveCount(0);
	expect((await author.goto('/panel/card-types'))?.status()).toBe(403);
});
