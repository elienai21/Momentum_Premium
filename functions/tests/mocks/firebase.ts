/* Mock Firebase Admin services for Jest (no real admin init). */

const defaultGetImpl = async () => ({ docs: [], empty: true, size: 0 });
export const __mockCollectionGet: jest.Mock<any, any> = jest.fn(defaultGetImpl);

let idSeq = 0;
const nextId = () => `mock-id-${++idSeq}`;

type MockDoc = {
  id: string;
  __path: string;
  collection: jest.Mock<any, any>;
  get: jest.Mock<any, any>;
  set: jest.Mock<any, any>;
  update: jest.Mock<any, any>;
  delete: jest.Mock<any, any>;
};

type MockCollection = {
  __path: string;
  doc: jest.Mock<any, any>;
  add: jest.Mock<any, any>;
  where: jest.Mock<any, any>;
  orderBy: jest.Mock<any, any>;
  limit: jest.Mock<any, any>;
  get: jest.Mock<any, any>;
};

const makeCollection = (path: string): MockCollection => {
  const col: Partial<MockCollection> = { __path: path };

  const makeDoc = (id?: string): MockDoc => {
    const docId = id || nextId();
    const docPath = `${path}/${docId}`;
    return {
      id: docId,
      __path: docPath,
      collection: jest.fn((sub: string) => makeCollection(`${docPath}/${sub}`)),
      get: jest.fn(async () => ({ exists: false, data: () => null, id: docId })),
      set: jest.fn(async () => undefined),
      update: jest.fn(async () => undefined),
      delete: jest.fn(async () => undefined),
    };
  };

  const makeQuery = (): any => ({
    where: jest.fn((): any => makeQuery()),
    orderBy: jest.fn((): any => makeQuery()),
    limit: jest.fn(() => ({ get: __mockCollectionGet })),
    get: __mockCollectionGet,
  });

  col.doc = jest.fn((id?: string) => makeDoc(id));
  col.add = jest.fn(async (_data?: any) => ({ id: nextId() }));
  col.where = jest.fn(() => makeQuery());
  col.orderBy = jest.fn(() => makeQuery());
  col.limit = jest.fn(() => ({ get: __mockCollectionGet }));
  col.get = jest.fn(() => __mockCollectionGet());

  return col as MockCollection;
};

export const db = {
  collection: jest.fn((path: string) => makeCollection(path)),
  runTransaction: jest.fn(async (fn: any) => {
    const transaction = {
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      get: jest.fn(),
    };
    await fn(transaction);
    (db as any).__lastTransaction = transaction;
    return undefined;
  }),
};

export const auth = {
  verifyIdToken: jest.fn(async () => ({ uid: "mock-user" })),
  getUser: jest.fn(async (uid: string) => ({ uid, email: `${uid}@example.com` })),
  setCustomUserClaims: jest.fn(async () => undefined),
};

export const admin = {
  firestore: jest.fn(() => db),
  auth: jest.fn(() => auth),
};

export const storage = {};

export const __resetMocks = () => {
  __mockCollectionGet.mockReset();
  __mockCollectionGet.mockImplementation(defaultGetImpl);
  idSeq = 0;
  (db.collection as jest.Mock).mockClear();
  (db.runTransaction as jest.Mock).mockClear();
  auth.verifyIdToken.mockClear();
  auth.getUser.mockClear();
  auth.setCustomUserClaims.mockClear();
  delete (db as any).__lastTransaction;
};

(db as any).__mockCollectionGet = __mockCollectionGet;
(db as any).__resetMocks = __resetMocks;
