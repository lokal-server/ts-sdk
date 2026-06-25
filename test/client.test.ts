import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createLokalClient, defineLokalApp, LokalApiError } from '../src';

const manifest = defineLokalApp({
  slug: 'recipe-box',
  collections: {
    recipes: { type: 'object' },
    settings: { type: 'object' },
  },
});

describe('defineLokalApp', () => {
  it('preserves collection keys for client.collection()', () => {
    const client = createLokalClient({
      instanceUrl: 'https://files.example.com',
      manifest,
      fetch: createFetchMock(),
    });

    expectTypeOf<Parameters<typeof client.collection>[0]>().toEqualTypeOf<
      'recipes' | 'settings'
    >();

    client.collection('recipes');
    // @ts-expect-error unknown is not a declared collection
    client.collection('unknown');
  });
});

describe('createLokalClient', () => {
  it('signs in, posts the manifest, normalizes instanceUrl, and stores the returned token', async () => {
    const fetchMock = createFetchMock([
      jsonResponse({
        apiBase: 'https://files.example.com/api/platform',
        app: {
          id: 'app_1',
          name: 'Recipe Box',
          slug: 'recipe-box',
          clientId: 'client_1',
          manifest,
        },
        user: {
          id: 'user_1',
          name: 'User',
          email: 'user@example.com',
          role: 'user',
        },
        token: {
          id: 'token_1',
          name: 'SDK',
          scopes: ['data:read', 'data:write'],
          createdAt: '2026-01-01T00:00:00.000Z',
          type: 'Bearer',
          rawToken: 'lokal_app_secret',
        },
      }),
    ]);

    const client = createLokalClient({
      instanceUrl: 'https://files.example.com///',
      manifest,
      fetch: fetchMock,
    });

    const response = await client.auth.signIn({
      email: 'user@example.com',
      password: 'password',
      tokenName: 'SDK',
    });

    expect(response.token.rawToken).toBe('lokal_app_secret');
    expect(client.getToken()).toBe('lokal_app_secret');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://files.example.com/api/platform/auth');

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(headers(init).get('Content-Type')).toBe('application/json');
    expect(headers(init).get('Authorization')).toBeNull();
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'user@example.com',
      password: 'password',
      manifest,
      tokenName: 'SDK',
    });
  });

  it('stores, reads, and clears tokens', () => {
    const client = createLokalClient({
      instanceUrl: 'https://files.example.com',
      manifest,
      token: 'initial-token',
      fetch: createFetchMock(),
    });

    expect(client.getToken()).toBe('initial-token');
    client.setToken('next-token');
    expect(client.getToken()).toBe('next-token');
    client.clearToken();
    expect(client.getToken()).toBeUndefined();
  });

  it('sends collection list/create/get/update/delete requests', async () => {
    const fetchMock = createFetchMock([
      jsonResponse([record('record_1', { title: 'Pancakes' })]),
      jsonResponse(record('record_2', { title: 'Waffles' }), { status: 201 }),
      jsonResponse(record('record_2', { title: 'Waffles' })),
      jsonResponse(record('record_2', { title: 'Crispy waffles' })),
      jsonResponse({ success: true }),
    ]);
    const client = createLokalClient({
      instanceUrl: 'https://files.example.com',
      manifest,
      token: 'lokal_app_secret',
      fetch: fetchMock,
    });
    const recipes = client.collection('recipes');

    await expect(recipes.list({ limit: 10 })).resolves.toHaveLength(1);
    await expect(recipes.create({ title: 'Waffles' }, { key: 'waffles' })).resolves.toMatchObject({
      id: 'record_2',
    });
    await expect(recipes.get('record_2')).resolves.toMatchObject({ id: 'record_2' });
    await expect(
      recipes.update('record_2', { title: 'Crispy waffles' }, { key: null }),
    ).resolves.toMatchObject({ id: 'record_2' });
    await expect(recipes.delete('record_2')).resolves.toEqual({ success: true });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://files.example.com/api/platform/apps/recipe-box/collections/recipes/records?limit=10',
      'https://files.example.com/api/platform/apps/recipe-box/collections/recipes/records',
      'https://files.example.com/api/platform/apps/recipe-box/collections/recipes/records/record_2',
      'https://files.example.com/api/platform/apps/recipe-box/collections/recipes/records/record_2',
      'https://files.example.com/api/platform/apps/recipe-box/collections/recipes/records/record_2',
    ]);
    expect(fetchMock.mock.calls.map((call) => call[1]?.method ?? 'GET')).toEqual([
      'GET',
      'POST',
      'GET',
      'PATCH',
      'DELETE',
    ]);
    for (const call of fetchMock.mock.calls) {
      expect(headers(call[1]).get('Authorization')).toBe('Bearer lokal_app_secret');
    }
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      value: { title: 'Waffles' },
      key: 'waffles',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[3]?.[1]?.body))).toEqual({
      value: { title: 'Crispy waffles' },
      key: null,
    });
  });

  it('gets and sets singleton collection values', async () => {
    const fetchMock = createFetchMock([
      jsonResponse({ theme: 'dark' }),
      jsonResponse(record('settings', { theme: 'light' })),
    ]);
    const client = createLokalClient({
      instanceUrl: 'https://files.example.com',
      manifest,
      token: 'lokal_app_secret',
      fetch: fetchMock,
    });
    const settings = client.collection('settings');

    await expect(settings.getValue()).resolves.toEqual({ theme: 'dark' });
    await expect(settings.setValue({ theme: 'light' })).resolves.toMatchObject({
      value: { theme: 'light' },
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'https://files.example.com/api/platform/apps/recipe-box/collections/settings/value',
      'https://files.example.com/api/platform/apps/recipe-box/collections/settings/value',
    ]);
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('PUT');
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      value: { theme: 'light' },
    });
  });

  it('throws a clear error when a token is required but missing', async () => {
    const fetchMock = createFetchMock();
    const client = createLokalClient({
      instanceUrl: 'https://files.example.com',
      manifest,
      fetch: fetchMock,
    });

    await expect(client.collection('recipes').list()).rejects.toThrow(
      'A Lokal app token is required. Sign in first or call setToken().',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws LokalApiError for non-2xx API responses', async () => {
    const fetchMock = createFetchMock([
      jsonResponse({ error: 'Nope' }, { status: 401, statusText: 'Unauthorized' }),
      jsonResponse({ error: 'Nope' }, { status: 401, statusText: 'Unauthorized' }),
    ]);
    const client = createLokalClient({
      instanceUrl: 'https://files.example.com',
      manifest,
      token: 'lokal_app_secret',
      fetch: fetchMock,
    });

    await expect(client.collection('recipes').list()).rejects.toMatchObject({
      name: 'LokalApiError',
      status: 401,
      message: 'Nope',
      body: { error: 'Nope' },
    });

    await client.collection('recipes').list().catch((error: unknown) => {
      expect(error).toBeInstanceOf(LokalApiError);
    });
  });
});

function createFetchMock(responses: Response[] = []) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    void input;
    void init;
    const response = responses.shift();
    if (!response) {
      throw new Error('Unexpected fetch call');
    }
    return response;
  });
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

function record(id: string, value: unknown) {
  return {
    id,
    appId: 'app_1',
    ownerId: 'user_1',
    collection: 'recipes',
    value,
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function headers(init: RequestInit | undefined) {
  return init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
}
