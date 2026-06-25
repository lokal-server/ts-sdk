export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type LokalCollections = Record<string, unknown>;

export interface LokalAppManifest<Collections extends LokalCollections = LokalCollections> {
  name?: string;
  slug: string;
  description?: string;
  developerName?: string;
  collections: Collections;
}

export interface LokalUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface RegisteredApp<Manifest extends LokalAppManifest = LokalAppManifest> {
  id: string;
  name: string;
  slug: string;
  clientId: string;
  manifest: Manifest;
  [key: string]: unknown;
}

export interface AppTokenWithSecret {
  id: string;
  name: string;
  scopes: Array<'data:read' | 'data:write'>;
  createdAt: string;
  type: 'Bearer';
  rawToken: string;
}

export interface AuthResponse<Manifest extends LokalAppManifest = LokalAppManifest> {
  apiBase: string;
  app: RegisteredApp<Manifest>;
  user: LokalUser;
  token: AppTokenWithSecret;
}

export interface AuthSignInOptions {
  email: string;
  password: string;
  tokenName?: string;
}

export interface DataRecord<Value extends JsonValue = JsonValue> {
  id: string;
  appId: string;
  ownerId: string;
  collection: string;
  value: Value;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  key?: string | null;
  [key: string]: unknown;
}

export interface SuccessResponse {
  success: boolean;
}

export interface ListOptions {
  limit?: number;
}

export interface WriteOptions {
  key?: string;
}

export interface UpdateOptions {
  key?: string | null;
}

export interface LokalCollectionClient {
  list(options?: ListOptions): Promise<DataRecord[]>;
  create(value: JsonValue, options?: WriteOptions): Promise<DataRecord>;
  get(recordId: string): Promise<DataRecord>;
  update(recordId: string, value: JsonValue, options?: UpdateOptions): Promise<DataRecord>;
  delete(recordId: string): Promise<SuccessResponse>;
  getValue(): Promise<JsonValue | null>;
  setValue(value: JsonValue): Promise<DataRecord>;
}

export type CollectionName<Manifest extends LokalAppManifest> = Extract<
  keyof Manifest['collections'],
  string
>;

export interface LokalClient<Manifest extends LokalAppManifest = LokalAppManifest> {
  auth: {
    signIn(options: AuthSignInOptions): Promise<AuthResponse<Manifest>>;
  };
  setToken(token: string): void;
  getToken(): string | undefined;
  clearToken(): void;
  collection(name: CollectionName<Manifest>): LokalCollectionClient;
}

export interface CreateLokalClientOptions<Manifest extends LokalAppManifest = LokalAppManifest> {
  instanceUrl: string;
  manifest: Manifest;
  token?: string;
  fetch?: typeof fetch;
}
