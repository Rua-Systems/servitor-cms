import { sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { createdAt, updatedAt, uuidPrimaryKey } from './columns';

export const cardTypes = sqliteTable(
	'card_types',
	{
		id: uuidPrimaryKey(),
		key: text('key').notNull(),
		name: text('name').notNull(),
		fieldsJson: text('fields_json').notNull().default('[]'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [uniqueIndex('card_types_key').on(table.key)]
);
