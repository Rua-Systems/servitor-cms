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

**Delete card type** removes the type and its fields. A type that cards still use cannot be deleted; delete its cards first.

## Cards

Cards are listed under **Content → Cards**. Choose a **Card type** and a language and select **New card** to open the editor. The list shows your own cards; staff can switch to **All cards**.

Cards follow the same workflow as posts: each language is a translation with its own draft, revisions, submission for review, scheduling and publishing, and moderators can hide a card. Cards never appear in the post list, on the blog or in the post API.

### The card tab

The editor opens a card on the **Card** tab, next to **Details**, **SEO** and **Settings**.

- **Fields of this translation** holds the fields with a separate value per language. They are saved with the draft, like the title and the content, and become live when the translation is published.
- **Fields shared by all translations** holds every other field. **Save card fields** stores them for all translations at once.
- **Gallery** holds up to 20 images from the media library in the order they are shown. The **Cover image** under **Settings** is the thumbnail of the card.

While a translation is live and the author's changes need approval, the shared fields and the gallery are locked, just like the post settings.

### Publishing

A card can be published or submitted for review once it has a title and every required field, shared or translated, has a value. The content, the excerpt and the meta description are optional for cards. The editor lists what is missing and opens the **Card** tab when you select a field.

Publishing and the other workflow changes send the `card.*` [webhook events](webhooks.md#events) instead of the `post.*` events.

## Cards in the API

External sites read published cards with an API key from `GET /api/v1/cards`, filter them by type, category, tag and the values of shared fields, for example a price range or a choice, and sort them by a field. `GET /api/v1/card-types` describes the types and their fields. See [Listing cards](api.md#listing-cards) for the parameters and the response.
