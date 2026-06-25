# @lokal/ts-sdk

TypeScript SDK for Lokal external apps. Lokal is a self-hosted file/data hub; this SDK helps apps define a manifest, authenticate a Lokal user, register the manifest, and read/write app-private JSON data.

## Install

```sh
npm install @lokal/ts-sdk
```

## Define an app

```ts
import { createLokalClient, defineLokalApp } from '@lokal/ts-sdk';

const recipeSchema = { type: 'object' };
const settingsSchema = { type: 'object' };

const manifest = defineLokalApp({
  name: 'Recipe Box',
  slug: 'recipe-box',
  collections: {
    recipes: recipeSchema,
    settings: settingsSchema,
  },
});

const lokal = createLokalClient({
  instanceUrl: 'https://files.example.com',
  manifest,
});
```

`defineLokalApp()` preserves collection names as literal TypeScript keys, so `lokal.collection('recipes')` is accepted and unknown collection names are rejected by TypeScript.

## Sign in

```ts
await lokal.auth.signIn({
  email: 'user@example.com',
  password: 'password',
  tokenName: 'Recipe Box',
});
```

Sign-in posts the manifest to `/api/platform/auth` and stores the returned app token in memory. You can also manage the token yourself:

```ts
lokal.setToken(savedToken);
const token = lokal.getToken();
lokal.clearToken();
```

The SDK does not persist tokens to `localStorage` or `sessionStorage`; consuming apps should choose their own persistence strategy.

## Collection records

```ts
const recipes = lokal.collection('recipes');

const created = await recipes.create({ title: 'Pancakes' }, { key: 'pancakes' });
const all = await recipes.list({ limit: 20 });
const one = await recipes.get(created.id);
const updated = await recipes.update(created.id, { title: 'Blueberry Pancakes' });
await recipes.delete(updated.id);
```

## Singleton values

Use singleton values for one JSON document per collection, such as settings.

```ts
await lokal.collection('settings').setValue({ theme: 'dark' });
const settings = await lokal.collection('settings').getValue();
```

## Custom fetch

By default the SDK uses global `fetch`. Pass a custom implementation for tests or non-standard runtimes:

```ts
const lokal = createLokalClient({
  instanceUrl: 'https://files.example.com',
  manifest,
  fetch: customFetch,
});
```

## Errors

Missing tokens throw a clear `Error`. Non-2xx API responses throw `LokalApiError` with `status`, `message`, and parsed `body` when available.

```ts
import { LokalApiError } from '@lokal/ts-sdk';

try {
  await lokal.collection('recipes').list();
} catch (error) {
  if (error instanceof LokalApiError) {
    console.error(error.status, error.body);
  }
}
```

## Contracts

The main Lokal repo owns the API contracts. Copies are kept in `contracts/`:

- `contracts/openapi.json`
- `contracts/lokal-manifest.schema.json`

Update them with:

```sh
npm run contracts:update
```

If the OpenAPI contract changes, update SDK types, wrappers, and tests in the same change.

## Publishing

The package is configured for public npm publishing with `private: false`, `files: ["dist", "contracts", "README.md"]`, and `publishConfig.access: "public"`.

Do not publish automatically. When ready, run checks and publish explicitly:

```sh
npm run check
npm publish
```
