import { LokalApiError } from './errors';
import type {
  AuthResponse,
  AuthSignInOptions,
  CreateLokalClientOptions,
  DataRecord,
  JsonValue,
  LokalAppManifest,
  LokalClient,
  LokalCollectionClient,
  SuccessResponse,
} from './types';

interface RequestOptions extends RequestInit {
  requiresToken?: boolean;
}

export function createLokalClient<Manifest extends LokalAppManifest>(
  options: CreateLokalClientOptions<Manifest>,
): LokalClient<Manifest> {
  const instanceUrl = normalizeInstanceUrl(options.instanceUrl);
  const fetcher = options.fetch ?? globalThis.fetch;
  let token = options.token;

  if (!fetcher) {
    throw new Error('A fetch implementation is required. Pass fetch in createLokalClient options.');
  }

  async function request<Result>(path: string, requestOptions: RequestOptions = {}): Promise<Result> {
    const { requiresToken = true, headers, ...init } = requestOptions;
    const requestHeaders = new Headers(headers);

    requestHeaders.set('Accept', 'application/json');

    if (init.body !== undefined && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    if (requiresToken) {
      if (!token) {
        throw new Error('A Lokal app token is required. Sign in first or call setToken().');
      }
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetcher(`${instanceUrl}${path}`, {
      ...init,
      headers: requestHeaders,
    });

    const body = await readBody(response);

    if (!response.ok) {
      throw new LokalApiError(response.status, getErrorMessage(response, body), body);
    }

    return body as Result;
  }

  const auth = {
    async signIn(signInOptions: AuthSignInOptions): Promise<AuthResponse<Manifest>> {
      const response = await request<AuthResponse<Manifest>>('/api/platform/auth', {
        method: 'POST',
        requiresToken: false,
        body: JSON.stringify({
          email: signInOptions.email,
          password: signInOptions.password,
          manifest: options.manifest,
          ...(signInOptions.tokenName ? { tokenName: signInOptions.tokenName } : {}),
        }),
      });

      token = response.token.rawToken;
      return response;
    },
  };

  function collection(name: string): LokalCollectionClient {
    const collectionPath = `/api/platform/apps/${encodeURIComponent(
      options.manifest.slug,
    )}/collections/${encodeURIComponent(name)}`;

    return {
      list(listOptions) {
        const search = new URLSearchParams();
        if (listOptions?.limit !== undefined) {
          search.set('limit', String(listOptions.limit));
        }

        const query = search.toString();
        return request<DataRecord[]>(`${collectionPath}/records${query ? `?${query}` : ''}`);
      },
      create(value: JsonValue, writeOptions) {
        return request<DataRecord>(`${collectionPath}/records`, {
          method: 'POST',
          body: JSON.stringify({
            value,
            ...(writeOptions?.key !== undefined ? { key: writeOptions.key } : {}),
          }),
        });
      },
      get(recordId: string) {
        return request<DataRecord>(`${collectionPath}/records/${encodeURIComponent(recordId)}`);
      },
      update(recordId: string, value: JsonValue, updateOptions) {
        return request<DataRecord>(`${collectionPath}/records/${encodeURIComponent(recordId)}`, {
          method: 'PATCH',
          body: JSON.stringify({
            value,
            ...(updateOptions && 'key' in updateOptions ? { key: updateOptions.key } : {}),
          }),
        });
      },
      delete(recordId: string) {
        return request<SuccessResponse>(`${collectionPath}/records/${encodeURIComponent(recordId)}`, {
          method: 'DELETE',
        });
      },
      getValue() {
        return request<JsonValue | null>(`${collectionPath}/value`);
      },
      setValue(value: JsonValue) {
        return request<DataRecord>(`${collectionPath}/value`, {
          method: 'PUT',
          body: JSON.stringify({ value }),
        });
      },
    };
  }

  return {
    auth,
    setToken(nextToken: string) {
      token = nextToken;
    },
    getToken() {
      return token;
    },
    clearToken() {
      token = undefined;
    },
    collection,
  } as LokalClient<Manifest>;
}

function normalizeInstanceUrl(instanceUrl: string): string {
  const normalized = instanceUrl.trim().replace(/\/+$/, '');
  if (!normalized) {
    throw new Error('instanceUrl is required.');
  }
  return normalized;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(response: Response, body: unknown): string {
  if (body && typeof body === 'object') {
    if ('error' in body && typeof body.error === 'string') {
      return body.error;
    }
    if ('message' in body && typeof body.message === 'string') {
      return body.message;
    }
  }

  return `Lokal API request failed with status ${response.status}`;
}
