/* Mock Firebase Admin services for Jest (no real admin init). */
import { jest } from "@jest/globals";

const store = new Map<string, any>();
let idSeq = 0;
const nextId = () => `mock-id-${++idSeq}`;

const makeSnapshot = (path: any): any => {
  const pathStr = typeof path === "string" ? path : (path?.path || "mock-path");
  const data = store.get(pathStr);
  const id = pathStr.split("/").pop() || "mock-id";
  return {
    id,
    ref: { path: pathStr },
    exists: store.has(pathStr),
    data: () => data,
    get: (field?: string) => (data ? data[field as keyof typeof data] : undefined),
  };
};

const makeDocRef = (path: any): any => {
  const pathStr = typeof path === "string" ? path : (path?.path || "mock-path");
  return {
    path: pathStr,
    id: pathStr.split("/").pop() || "mock-id",
    set: jest.fn(async (data: any, opts?: any) => {
      const existing = store.get(pathStr) || {};
      store.set(pathStr, opts?.merge ? { ...existing, ...data } : data);
    }),
    update: jest.fn(async (data: any) => {
      const existing = store.get(pathStr) || {};
      store.set(pathStr, { ...existing, ...data });
    }),
    delete: jest.fn(async () => {
      store.delete(pathStr);
    }),
    get: jest.fn(async () => makeSnapshot(pathStr)),
    collection: jest.fn((sub: string) => makeCollection(`${pathStr}/${sub}`)),
  };
};

const makeQuery = (paths: string[]): any => ({
  where: jest.fn(() => makeQuery(paths)),
  orderBy: jest.fn(() => makeQuery(paths)),
  limit: jest.fn(() => makeQuery(paths)),
  get: jest.fn(async () => {
    const docs = paths.map((p) => makeSnapshot(p)).filter((d) => d.exists);
    return { docs, empty: docs.length === 0, size: docs.length };
  }),
});

export const makeCollection = (path: string): any => {
  const listPaths = Array.from(store.keys()).filter((k) => k.startsWith(`${path}/`));
  return {
    __path: path,
    doc: jest.fn((id?: string) => makeDocRef(`${path}/${id || nextId()}`)),
    add: jest.fn(async (data: any) => {
      const docPath = `${path}/${nextId()}`;
      store.set(docPath, data);
      return { id: docPath.split("/").pop() };
    }),
    where: jest.fn(() => makeQuery(listPaths)),
    orderBy: jest.fn(() => makeQuery(listPaths)),
    limit: jest.fn(() => makeQuery(listPaths)),
    get: jest.fn(async () => {
      const docs = listPaths.map((p) => makeSnapshot(p)).filter((d) => d.exists);
      return { docs, empty: docs.length === 0, size: docs.length };
    }),
  };
};

export const db: any = {
  collection: jest.fn((path: string) => makeCollection(path)),
  doc: jest.fn((path: string) => makeDocRef(path)),
  runTransaction: jest.fn(async (fn: any) => {
    const tx = {
      get: jest.fn(async (ref: any) => makeSnapshot(ref.path || ref.__path || ref)),
      set: jest.fn(async (ref: any, data: any, opts?: any) => {
        const path = ref.path || ref.__path || ref;
        const existing = store.get(path) || {};
        store.set(path, opts?.merge ? { ...existing, ...data } : data);
      }),
      update: jest.fn(async (ref: any, data: any) => {
        const path = ref.path || ref.__path || ref;
        const existing = store.get(path) || {};
        store.set(path, { ...existing, ...data });
      }),
      delete: jest.fn(async (ref: any) => {
        const path = ref.path || ref.__path || ref;
        store.delete(path);
      }),
    };
    const result = await fn(tx);
    (db as any).__lastTransaction = tx;
    return result;
  }),
  __store: store,
};

const authMock: any = {
  verifyIdToken: jest.fn(async () => ({ uid: "mock-user", email: "mock@example.com" })),
  getUser: jest.fn(async (uid: string) => ({ uid, email: `${uid}@example.com` })),
  setCustomUserClaims: jest.fn(async () => undefined),
};

const Timestamp = {
  fromMillis: (ms: number) => ({ toMillis: () => ms }),
  now: () => ({ toMillis: () => Date.now() }),
};

const FieldValue = {
  serverTimestamp: () => new Date().toISOString(),
};

// Export as functions to match firebase-admin expectation
export const firestore: any = jest.fn(() => db);
firestore.FieldValue = FieldValue;
firestore.Timestamp = Timestamp;

export const auth: any = jest.fn(() => authMock);
export const storage: any = jest.fn(() => ({
  bucket: jest.fn(() => ({
    file: jest.fn(() => ({
      getSignedUrl: async () => ["https://mock-url.com"],
      save: async () => undefined,
      exists: async () => [true],
    })),
  })),
}));

export const apps = [];
export const initializeApp = jest.fn();
export const app = jest.fn(() => ({}));

// For __resetMocks and other test utilities
export const __store = store;
export const __resetMocks = () => {
  store.clear();
  idSeq = 0;
  jest.clearAllMocks();
};
export const __setDoc = (path: string, data: any) => {
  store.set(path, data);
};
