/* Mock Firebase Admin services for Jest (no real admin init). */

const store = new Map<string, any>();
let idSeq = 0;
const nextId = () => `mock-id-${++idSeq}`;

const makeSnapshot = (path: string) => {
  const data = store.get(path);
  const id = path.split("/").pop() || "mock-id";
  return {
    id,
    exists: store.has(path),
    data: () => data,
    get: (field?: string) => (data ? data[field as keyof typeof data] : undefined),
  };
};

const makeDocRef = (path: string) => ({
  path,
  id: path.split("/").pop() || "mock-id",
  set: jest.fn(async (data: any, opts?: any) => {
    const existing = store.get(path) || {};
    store.set(path, opts?.merge ? { ...existing, ...data } : data);
  }),
  update: jest.fn(async (data: any) => {
    const existing = store.get(path) || {};
    store.set(path, { ...existing, ...data });
  }),
  delete: jest.fn(async () => {
    store.delete(path);
  }),
  get: jest.fn(async () => makeSnapshot(path)),
  collection: jest.fn((sub: string) => makeCollection(`${path}/${sub}`)),
});

const makeQuery = (paths: string[]) => ({
  where: jest.fn(() => makeQuery(paths)),
  orderBy: jest.fn(() => makeQuery(paths)),
  limit: jest.fn(() => makeQuery(paths)),
  get: jest.fn(async () => {
    const docs = paths.map((p) => makeSnapshot(p)).filter((d) => d.exists);
    return { docs, empty: docs.length === 0, size: docs.length };
  }),
});

const makeCollection = (path: string) => {
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

export const db = {
  collection: jest.fn((path: string) => makeCollection(path)),
  doc: jest.fn((path: string) => makeDocRef(path)),
  runTransaction: jest.fn(async (fn: any) => {
    const tx = {
      get: async (ref: any) => makeSnapshot(ref.path || ref.__path || ref),
      set: async (ref: any, data: any, opts?: any) => {
        const path = ref.path || ref.__path || ref;
        const existing = store.get(path) || {};
        store.set(path, opts?.merge ? { ...existing, ...data } : data);
      },
      update: async (ref: any, data: any) => {
        const path = ref.path || ref.__path || ref;
        const existing = store.get(path) || {};
        store.set(path, { ...existing, ...data });
      },
      delete: async (ref: any) => {
        const path = ref.path || ref.__path || ref;
        store.delete(path);
      },
    };
    const result = await fn(tx);
    (db as any).__lastTransaction = tx;
    return result;
  }),
  __store: store,
};

export const auth = {
  verifyIdToken: jest.fn(async () => ({ uid: "mock-user" })),
  getUser: jest.fn(async (uid: string) => ({ uid, email: `${uid}@example.com` })),
  setCustomUserClaims: jest.fn(async () => undefined),
};

const Timestamp = {
  fromMillis: (ms: number) => ({ toMillis: () => ms }),
};

const FieldValue = {
  serverTimestamp: () => new Date().toISOString(),
};

const firestoreFn: any = jest.fn(() => db);
firestoreFn.FieldValue = FieldValue;
firestoreFn.Timestamp = Timestamp;

export const admin = {
  firestore: firestoreFn,
  auth: jest.fn(() => auth),
};

export const storage = {};

export const __resetMocks = () => {
  store.clear();
  idSeq = 0;
  (db.collection as jest.Mock).mockClear();
  (db.doc as jest.Mock).mockClear();
  (db.runTransaction as jest.Mock).mockClear();
  auth.verifyIdToken.mockClear();
  auth.getUser.mockClear();
  auth.setCustomUserClaims.mockClear();
  delete (db as any).__lastTransaction;
};

export const __setDoc = (path: string, data: any) => {
  store.set(path, data);
};
