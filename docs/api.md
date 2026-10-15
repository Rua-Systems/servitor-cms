# REST API

The REST API under `/api/v1` gives other applications read-only access to published content: a static site generator, a mobile app or another website. It returns JSON, never exposes drafts, and is described in OpenAPI 3.1 at `/api/v1/openapi.json`.

## API keys

Every request needs an API key. Staff create keys under **Integrations → API keys**:

1. Enter a **Name** that tells where the key is used, for example the name of a website.
2. Limit the key if you like:
   - **Languages**: clear **All languages** and select the languages the key may read.
   - **Categories**: clear **All categories** and select categories. Posts without a category are only visible to keys with all categories.
   - **Expires after**: a date after which the key stops working.
   - **Requests per minute**: a limit for this key. Empty means the default from the settings, 120 unless changed.
3. Choose **Create key** and confirm with your password, and a current code when two-factor authentication is on.
4. Copy the key. It starts with `svt_` and is shown only once.

Servitor stores only a SHA-256 hash of the key and a short prefix to find it. The list shows each key's status (**Active**, **Expired** or **Revoked**), scope, limit, creator and last use. **Revoke** ends access immediately and cannot be undone. Treat keys like passwords: keep them in the server-side configuration of the consuming application, never in public code.

## Authentication

Send the key as a bearer token:

```bash
curl -H "Authorization: Bearer svt_your_key" "https://cms.example.com/api/v1/languages"
```

- A missing or invalid key is answered with `401` and a `WWW-Authenticate` header.
- A key in the query string, such as `?api_key=`, is refused with `400 key_in_query` even when it is valid, because addresses end up in logs.
- The API never uses cookies, so a signed-in panel session does not grant API access.

## Endpoints

| Endpoint                                  | Returns                                             |
| ----------------------------------------- | --------------------------------------------------- |
| `GET /api/v1/posts`                       | Posts with their published translations, paginated. |
| `GET /api/v1/posts/{id}`                  | One post with all its published translations.       |
| `GET /api/v1/posts/by-slug/{lang}/{slug}` | The same, looked up by the slug of one translation. |
| `GET /api/v1/cards`                       | Cards with their published translations, paginated. |
| `GET /api/v1/cards/{id}`                  | One card with all its published translations.       |
| `GET /api/v1/cards/by-slug/{lang}/{slug}` | The same, looked up by the slug of one translation. |
| `GET /api/v1/card-types`                  | Card types with their fields.                       |
| `GET /api/v1/languages`                   | Enabled content languages.                          |
| `GET /api/v1/categories`                  | Categories with their names and slugs per language. |
| `GET /api/v1/tags?lang={code}`            | The tags of a language with their post counts.      |
| `GET /api/v1/authors`                     | Public author profiles: ID, name, bio and avatar.   |
| `GET /api/v1/openapi.json`                | The OpenAPI description. It needs no key.           |

Only `GET`, `HEAD` and `OPTIONS` are accepted; other methods get `405`. Every response respects the key's language and category limits: a post outside them is answered with `404`, as if it did not exist.

### Listing posts

`GET /api/v1/posts` accepts these parameters:

| Parameter                        | Meaning                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `lang`                           | Language codes. Repeat the parameter or separate codes with commas. At most 20.                                       |
| `category`, `tag`, `author`      | IDs to filter by.                                                                                                     |
| `q`                              | Full-text search over title, excerpt and content, up to 200 characters and 10 terms. Accents are ignored.             |
| `published_from`, `published_to` | A date such as `2026-09-01`, covering the whole day in UTC, or a date-time with an offset.                            |
| `sort`                           | `published_at` (default) or `updated_at`.                                                                             |
| `order`                          | `desc` (default) or `asc`.                                                                                            |
| `page`                           | The page, from 1.                                                                                                     |
| `per_page`                       | Items per page, 20 by default and at most 100.                                                                        |
| `fallback`                       | `default` includes posts that have no translation in the requested languages with their default-language translation. |
| `content_format`                 | `html` (default), `json` for the editor document, or `both`.                                                          |

Unknown parameters and invalid values are answered with `400 invalid_query`, so typos do not go unnoticed. The single-post and single-card endpoints accept `content_format`; the other lists accept `page` and `per_page`, and `tags` requires `lang`.

### Listing cards

[Cards](cards.md) are never returned by the post endpoints. `GET /api/v1/cards` accepts the parameters of the post list except `author`, and these:

| Parameter                            | Meaning                                                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`                               | The key of a card type, such as `product`. `GET /api/v1/card-types` lists the keys.                                                                    |
| `field[key]`                         | Only cards whose shared field `key` has this value. Separate several values with commas to match any of them. Yes-or-no fields take `true` or `false`. |
| `field[key][min]`, `field[key][max]` | A range for number, price and date fields, including the limits. Dates are written like `2026-10-16`.                                                  |
| `sort`                               | `published_at` (default), `updated_at`, or `field.key` to sort by a shared field. Cards without a value come last in both directions.                  |

Field filters and field sorting need `type`, because the fields belong to the type. They work on fields shared by all translations; long texts and fields with a value per language cannot be filtered or sorted. A request with a field the type does not have, a choice that is not one of its options or a value of the wrong kind is answered with `400 invalid_query`. At most 20 fields can be filtered at once.

For example, products under 50 dollars that are in stock, cheapest first:

```text
GET /api/v1/cards?type=product&field[availability]=in_stock&field[price][max]=50&sort=field.price&order=asc
```

## Responses

Lists contain `data` and `meta`:

```json
{
  "data": [],
  "meta": { "page": 1, "per_page": 20, "total": 42, "total_pages": 3 }
}
```

Single items contain only `data`. A post looks like this:

```json
{
  "data": {
    "id": "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    "author": {
      "id": "6fa459ea-ee8a-4ca4-894e-db77e160355e",
      "name": "Ada Lovelace",
      "bio": "Writes about engines and numbers.",
      "avatar": null
    },
    "category": {
      "id": "0f8fad5b-d9cb-469f-a165-70867728950e",
      "translations": [{ "language": "en", "name": "History", "slug": "history" }]
    },
    "cover": null,
    "published_at": "2026-09-24T09:00:00.000Z",
    "updated_at": "2026-09-24T10:30:00.000Z",
    "translations": [
      {
        "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        "language": "en",
        "slug": "the-analytical-engine",
        "url": "https://cms.example.com/blog/en/the-analytical-engine",
        "title": "The Analytical Engine",
        "excerpt": "A short history of the first general-purpose computer.",
        "meta_title": null,
        "meta_description": null,
        "og_image": null,
        "tags": [
          { "id": "9b2c1f10-58d1-4a7e-9a8c-2a3e3c7f1b11", "name": "history", "slug": "history" }
        ],
        "reading_time_minutes": 4,
        "published_at": "2026-09-24T09:00:00.000Z",
        "updated_at": "2026-09-24T10:30:00.000Z",
        "content_html": "<p>In 1837, Charles Babbage described…</p>"
      }
    ]
  }
}
```

- `url` is the address on the public site, or `null` in headless mode.
- `content_html` is sanitized HTML, ready to insert into a page. `content_json` is the editor document for applications that render content themselves.
- Images, such as `cover`, `og_image` and `avatar`, are objects with `id`, `width`, `height`, `alt` (alternative text per language) and `variants` with absolute URLs, widths and heights for the sizes `480`, `960`, `1600` and `full`.
- Dates are ISO 8601 in UTC.

A card has its type, the fields shared by all translations in `values`, its `gallery` in order and, in each translation, the fields with a value per language. Fields without a value are `null`, and yes-or-no fields are `true` or `false`. Cards have no author, no public address and no reading time:

```json
{
  "data": {
    "id": "c2f4a6b8-1d3e-4f50-8a7b-9c0d1e2f3a4b",
    "type": { "id": "5d1c7e3a-8f2b-4a6c-9e0d-1b2c3d4e5f60", "key": "product", "name": "Product" },
    "category": null,
    "cover": null,
    "gallery": [],
    "values": {
      "sku": "LAMP-1",
      "price": 49.5,
      "sale_price": null,
      "stock": 12,
      "availability": "in_stock",
      "brand": null
    },
    "published_at": "2026-10-16T09:00:00.000Z",
    "updated_at": "2026-10-16T09:00:00.000Z",
    "translations": [
      {
        "id": "8e7d6c5b-4a39-4281-9f0e-1d2c3b4a5f6e",
        "language": "en",
        "slug": "desk-lamp",
        "title": "Desk lamp",
        "excerpt": "A small lamp for long evenings.",
        "meta_title": null,
        "meta_description": null,
        "og_image": null,
        "tags": [],
        "values": { "details": "Brass, 40 cm high." },
        "published_at": "2026-10-16T09:00:00.000Z",
        "updated_at": "2026-10-16T09:00:00.000Z",
        "content_html": "<p>The lamp has a dimmer…</p>"
      }
    ]
  }
}
```

`GET /api/v1/card-types` returns each type with `id`, `key`, `name`, `updated_at` and its `fields` in order. Each field has `key`, `label`, `kind` (`text`, `long_text`, `number`, `price`, `select`, `boolean`, `url` or `date`), `required`, `translatable`, the `options` of a choice and the `currency` of a price.

## Errors

Errors always have the same shape:

```json
{ "error": { "code": "not_found", "message": "The requested resource does not exist." } }
```

| Status | Code                 | Meaning                                                     |
| ------ | -------------------- | ----------------------------------------------------------- |
| 400    | `invalid_query`      | An unknown parameter or an invalid value.                   |
| 400    | `key_in_query`       | An API key was sent in the query string.                    |
| 401    | `unauthorized`       | The key is missing, invalid, expired or revoked.            |
| 404    | `not_found`          | Nothing matches, or the content is outside the key's scope. |
| 405    | `method_not_allowed` | The method is not `GET`, `HEAD` or `OPTIONS`.               |
| 429    | `rate_limited`       | The key used up its requests for the current minute.        |
| 500    | `internal_error`     | An unexpected error; it is logged on the server.            |

## Caching

Responses carry `ETag` and `Last-Modified` and are marked `Cache-Control: private, no-cache`. Send the stored values back with `If-None-Match` or `If-Modified-Since`, and the API answers `304 Not Modified` without a body when nothing changed:

```bash
curl -i -H "Authorization: Bearer svt_your_key" -H 'If-None-Match: "Qm9vay1zdG9yZS1leGFtcGxlLWV0YWc"' "https://cms.example.com/api/v1/posts?lang=en"
```

Combine caching with [webhooks](webhooks.md) to fetch content only when it changes.

## Rate limits

Each key may make a number of requests per minute: its own limit, or the default from the settings. Every response reports the state of the current window:

| Header                | Meaning                                         |
| --------------------- | ----------------------------------------------- |
| `RateLimit-Limit`     | Requests allowed per minute for this key.       |
| `RateLimit-Remaining` | Requests left in the current window.            |
| `RateLimit-Reset`     | Seconds until the window ends.                  |
| `Retry-After`         | Only on `429`: seconds to wait before retrying. |

## Calling the API from browsers

Browsers may call the API only from origins on the allowlist under **Integrations → CORS**. Enter origins as `scheme://host[:port]`, for example `https://www.example.com`; they are matched exactly, wildcards are not accepted and credentials are never allowed.

Keep in mind that a key used in a browser is visible to every visitor. Only do this with a key that is limited to content you would publish anyway, or call the API from your server instead.

## Example: fetching every post

```js
const base = 'https://cms.example.com/api/v1';
const headers = { Authorization: `Bearer ${process.env.SERVITOR_API_KEY}` };

async function fetchAllPosts(language) {
  const posts = [];

  for (let page = 1; ; page += 1) {
    const response = await fetch(`${base}/posts?lang=${language}&per_page=100&page=${page}`, {
      headers
    });

    if (!response.ok) {
      throw new Error(`The API answered ${response.status}`);
    }

    const body = await response.json();

    posts.push(...body.data);

    if (page >= body.meta.total_pages) {
      return posts;
    }
  }
}
```
