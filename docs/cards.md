# Cards

Cards are structured items such as products, events or listings that an external site fetches and renders in its own design. Every card belongs to a card type, which defines the fields its cards have.

## Card types

Staff manage the types under **Content → Card types**.

### Creating a type

Enter a **Name** and choose how to start:

- **Product** fills in a structure that follows common online shops: a stock-keeping code (`sku`), a **Price** and a **Sale price** in US dollars, the **Stock**, the **Availability** with the options `in_stock`, `out_of_stock` and `preorder`, the **Brand** and **Details** with a separate text per language.
- **An empty type** starts without fields.

The **Key** identifies the type in the API, for example `product`. It may contain lowercase letters, digits and dashes and must be unique; leave it empty to create it from the name.

### Fields

The type page lists its fields in the order the card editor and the API use. **Add field** appends one, and the arrows change the order. Each field has:

| Setting                         | Meaning                                                                                                                                                              |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Label**                       | The name shown in the card editor.                                                                                                                                   |
| **Key**                         | The name in the API. It starts with a lowercase letter and contains lowercase letters, digits and underscores, such as `sale_price`. It is suggested from the label. |
| **Type**                        | One of the field types below.                                                                                                                                        |
| **Required**                    | A card cannot be published while the field is empty.                                                                                                                 |
| **Separate value per language** | Only for text fields: each translation of a card gets its own value. Other values are shared by all translations.                                                    |

| Field type    | Values                                                                                  |
| ------------- | --------------------------------------------------------------------------------------- |
| **Text**      | A single line of text.                                                                  |
| **Long text** | Several lines of plain text.                                                            |
| **Number**    | A whole or decimal number.                                                              |
| **Price**     | An amount in the **Currency** of the field, a three-letter code such as `USD` or `TRY`. |
| **Choice**    | One of the **Options** of the field, entered one per line.                              |
| **Yes or no** | A checkbox.                                                                             |
| **Link**      | An `http` or `https` address.                                                           |
| **Date**      | A calendar date.                                                                        |

A type has at most 40 fields, and a choice field at most 50 options. **Save card type** stores the changes; every change is recorded in the audit log.

### Deleting a type

**Delete card type** removes the type and its fields.
