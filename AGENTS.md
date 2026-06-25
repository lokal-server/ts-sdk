# AGENTS.md

## Project

This repo contains the Lokal TypeScript SDK.

Lokal is a self-hosted file/data hub. External apps use this SDK to:

- define their Lokal app manifest
- authenticate a Lokal user
- register the manifest during authentication
- receive a user-bound app token
- read/write app-private JSON data

The SDK is distributed through npm.

## Stack

Use:

- TypeScript
- Vite library mode
- npm/package-lock
- Vitest
- global `fetch`
- generated or copied contracts from the main Lokal repo

Do not add React as a dependency.

## Package goals

The package should be usable like this:

```ts
import { createLokalClient, defineLokalApp } from '@lokal/sdk';

const manifest = defineLokalApp({
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

await lokal.auth.signIn({
  email: 'user@example.com',
  password: 'password',
});

await lokal.collection('recipes').create({
  title: 'Pancakes',
});

Contract source
The main Lokal repo owns the API contract.

Contracts are expected at:

contracts/openapi.json
contracts/lokal-manifest.schema.json

Source URLs during early development:

https://raw.githubusercontent.com/didair/lokal/main/contracts/openapi.json
https://raw.githubusercontent.com/didair/lokal/main/contracts/lokal-manifest.schema.json

Keep SDK behavior aligned with those contracts.

If the OpenAPI contract changes, update generated types/wrappers in the same change.

Public API rules
Prefer a small, stable API:

defineLokalApp()
createLokalClient()
LokalApiError
exported useful types
Avoid leaking internal/generated API details unless they are intentionally exported.

TypeScript rules
Preserve collection names as literal keys from defineLokalApp.
client.collection(name) should only accept known collection names.
Treat collection schema values as opaque for v1.
Do not attempt deep runtime validation of arbitrary app schemas yet.
Keep strict TypeScript enabled.
Client behavior
The SDK should:

normalize instanceUrl
allow a custom fetch
store the app token in memory
expose setToken, getToken, and clearToken
throw a clear error when a token is required but missing
throw LokalApiError for non-2xx API responses
Do not add automatic localStorage/sessionStorage token persistence in v1. Consuming apps should decide persistence.

Commands
Expected commands:

npm run build
npm run test
npm run typecheck
npm run lint
npm run check
npm run contracts:update

npm run check should run typecheck, lint, and tests.

Distribution
The SDK should be npm-ready.

Package settings should include:

{
  "private": false,
  "files": ["dist", "contracts", "README.md"],
  "publishConfig": {
    "access": "public"
  }
}

Do not publish automatically unless explicitly asked.

Implementation style
Keep code simple.
Avoid unnecessary abstractions.
No framework dependency.
No OAuth implementation yet.
No file API implementation yet.
Focus only on platform auth and JSON data APIs.
Testing expectations
Add Vitest tests for:

manifest key inference
sign-in request/response handling
token storage
collection list/create/get/update/delete
singleton get/set
missing token errors
non-2xx API errors
Mock fetch; do not require a running Lokal instance for unit tests.
