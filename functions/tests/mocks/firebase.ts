import { jest } from "@jest/globals";
import type * as Firestore from "firebase-admin/firestore";

// --- Mock Store ---
class MockFirestoreStore {
  private data = new Map<string, any>();

  constructor() {
    this.data = new Map();
  }

  clear() {
    this.data.clear();
  }

  get(path: string) {
    return this.data.get(path);
  }

  set(path: string, value: any) {
    this.data.set(path, value);
  }

  delete(path: string) {
    this.data.delete(path);
  }

  getKeys() {
    return Array.from(this.data.keys());
  }
}

export const store = new MockFirestoreStore();
let idSeq = 0;
const nextId = () => `mock-id-${++idSeq}`;

// --- Firestore Mocks ---

// Mock helper to simulate DocumentSnapshot
const makeSnapshot = (path: string, data: any): Partial<Firestore.DocumentSnapshot> => ({
  id: path.split("/").pop() || "mock-id",
  ref: makeDocRef(path) as any,
  exists: data !== undefined,
  data: () => data,
  get: (field: string) => (data ? data[field] : undefined),
});

// Mock helper to simulate DocumentReference
const makeDocRef = (path: string): Partial<Firestore.DocumentReference> => ({
  path: path,
  id: path.split("/").pop() || "mock-id",
  collection: (collectionPath: string) => makeCollection(`${path}/${collectionPath}`) as any,
  set: jest.fn(async (data: any, options?: any) => {
    const existing = store.get(path);
    const merged = options?.merge && existing ? { ...existing, ...data } : data;
    store.set(path, merged);
    return { writeTime: { toMillis: () => Date.now() } } as any;
  }),
  update: jest.fn(async (data: any) => {
    const existing = store.get(path) || {};
    store.set(path, { ...existing, ...data });
    return { writeTime: { toMillis: () => Date.now() } } as any;
  }),
  delete: jest.fn(async () => {
    store.delete(path);
    return { writeTime: { toMillis: () => Date.now() } } as any;
  }),
  get: jest.fn(async () => {
    const data = store.get(path);
    return makeSnapshot(path, data) as any;
  }),
});

// Mock helper to simulate Query
const makeQuery = (basePath: string, constraints: any[] = []): any => {
  return {
    where: jest.fn((...args: any[]) => makeQuery(basePath, [...constraints, { type: "where", args }])),
    orderBy: jest.fn((...args: any[]) => makeQuery(basePath, [...constraints, { type: "orderBy", args }])),
    limit: jest.fn((limit) => makeQuery(basePath, [...constraints, { type: "limit", limit }])),
    get: jest.fn(async () => {
      // Basic filtering simulation
      let keys = store.getKeys().filter((k) => {
        // Direct child check: basePath/childId (no further slashes)
        if (!k.startsWith(`${basePath}/`)) return false;
        const relative = k.slice(basePath.length + 1);
        return !relative.includes("/");
      });

      let docs = keys.map((k) => makeSnapshot(k, store.get(k))).filter((s) => s.exists);

      // Note: Real filtering logic (where/orderBy) is complex to mock fully. 
      // This simple mock returns all docs in collection by default.

      return {
        docs,
        empty: docs.length === 0,
        size: docs.length,
        forEach: (callback: (doc: any) => void) => docs.forEach(callback),
      };
    }),
  };
};

// Mock helper to simulate CollectionReference
const makeCollection = (path: string): Partial<Firestore.CollectionReference> => ({
  path: path, // Not standard property but helpful for debug
  doc: jest.fn((id?: string) => makeDocRef(`${path}/${id || nextId()}`)) as any,
  add: jest.fn(async (data: any) => {
    const newId = nextId();
    const docPath = `${path}/${newId}`;
    store.set(docPath, data);
    return makeDocRef(docPath) as any;
  }) as any,
  // Query interface methods
  where: jest.fn((...args: any[]) => makeQuery(path).where(...args)) as any,
  orderBy: jest.fn((...args: any[]) => makeQuery(path).orderBy(...args)) as any,
  limit: jest.fn((val) => makeQuery(path).limit(val)) as any,
  get: jest.fn(() => makeQuery(path).get()),
});

// Mock Firestore instance
export const db = {
  collection: jest.fn((path: string) => makeCollection(path)),
  doc: jest.fn((path: string) => makeDocRef(path)),
  runTransaction: jest.fn(async (updateFunction: (transaction: any) => Promise<any>) => {
    const transaction = {
      get: jest.fn(async (ref: any) => {
        const path = ref.path;
        return makeSnapshot(path, store.get(path));
      }),
      set: jest.fn((ref: any, data: any, options?: any) => {
        const path = ref.path;
        const existing = store.get(path);
        const merged = options?.merge && existing ? { ...existing, ...data } : data;
        store.set(path, merged);
        return transaction;
      }),
      update: jest.fn((ref: any, data: any) => {
        const path = ref.path;
        const existing = store.get(path) || {};
        store.set(path, { ...existing, ...data });
        return transaction;
      }),
      delete: jest.fn((ref: any) => {
        store.delete(ref.path);
        return transaction;
      }),
    };
    (db as any).__lastTransaction = transaction;
    return updateFunction(transaction);
  }),
  getAll: jest.fn(async (...refs: any[]) => {
    return Promise.all(refs.map(async (ref) => {
      const path = ref.path;
      return makeSnapshot(path, store.get(path));
    }));
  }),
  batch: jest.fn(() => {
    const batch = {
      set: jest.fn((ref: any, data: any, options?: any) => {
        const path = ref.path;
        const existing = store.get(path);
        const merged = options?.merge && existing ? { ...existing, ...data } : data;
        store.set(path, merged);
        return batch;
      }),
      update: jest.fn((ref: any, data: any) => {
        const path = ref.path;
        const existing = store.get(path) || {};
        store.set(path, { ...existing, ...data });
        return batch;
      }),
      delete: jest.fn((ref: any) => {
        store.delete(ref.path);
        return batch;
      }),
      commit: jest.fn(async () => {
        return [];
      })
    };
    return batch;
  }),
  settings: jest.fn(),
};

// --- Auth Mocks ---
const authMock = {
  verifyIdToken: jest.fn(async (token: string) => {
    if (token === "error") throw new Error("Invalid token");
    return { uid: "mock-uid", email: "mock@example.com" };
  }),
  getUser: jest.fn(async (uid: string) => ({
    uid,
    email: `${uid}@example.com`,
    displayName: "Mock User",
  })),
  getUserByEmail: jest.fn(async (email: string) => ({
    uid: "mock-uid",
    email,
    displayName: "Mock User",
  })),
  setCustomUserClaims: jest.fn(async () => { }),
  createUser: jest.fn(async (props: any) => ({
    uid: props.uid || nextId(),
    ...props
  })),
  updateUser: jest.fn(async (uid: string, props: any) => ({
    uid,
    ...props
  })),
  deleteUser: jest.fn(async () => { }),
};

// --- Other Services ---
export const firestore = jest.fn(() => db);
(firestore as any).FieldValue = {
  serverTimestamp: () => "MOCK_SERVER_TIMESTAMP",
  increment: (n: number) => ({ _method: "increment", value: n }),
  arrayUnion: (...args: any[]) => ({ _method: "arrayUnion", args }),
  arrayRemove: (...args: any[]) => ({ _method: "arrayRemove", args }),
};
(firestore as any).Timestamp = {
  now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() }),
  fromDate: (date: Date) => ({ toMillis: () => date.getTime(), toDate: () => date }),
  fromMillis: (ms: number) => ({ toMillis: () => ms, toDate: () => new Date(ms) }),
};

export const auth = jest.fn(() => authMock);

export const storage = jest.fn(() => ({
  bucket: jest.fn((name?: string) => ({
    name: name || "default-bucket",
    file: jest.fn((path: string) => ({
      name: path,
      save: jest.fn(async () => { }),
      exists: jest.fn(async () => [true]),
      getSignedUrl: jest.fn(async () => ["https://mock-storage-url.com"]),
      download: jest.fn(async () => [Buffer.from("mock content")]),
      setMetadata: jest.fn(async () => { }),
      delete: jest.fn(async () => { }),
    })),
  })),
}));

export const messaging = jest.fn(() => ({
  send: jest.fn(async () => "mock-message-id"),
  sendMulticast: jest.fn(async () => ({ successCount: 1, failureCount: 0 })),
}));

// Mock firebase-admin entry points
export const initializeApp = jest.fn();
export const credential = {
  cert: jest.fn(),
  applicationDefault: jest.fn(),
};

export const apps = [];

// --- Test Helpers ---
export const __resetMocks = () => {
  store.clear();
  idSeq = 0;
  jest.clearAllMocks();
};

export const __setDoc = (path: string, data: any) => {
  store.set(path, data);
};

export const __store = store; // Expose for deeper inspection if needed

export default {
  initializeApp,
  firestore,
  auth,
  storage,
  messaging,
  credential,
  apps,
};
