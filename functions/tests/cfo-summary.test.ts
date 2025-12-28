import "./setupFirebaseMock";
import request from "supertest";
import { makeTestApp, debugIfNotOk } from "./helpers/testApp";

const mockGet = jest.fn();
const mockWhere = jest.fn(() => ({ limit: () => ({ get: mockGet }) }));
const mockCollection = jest.fn(() => ({ where: mockWhere }));

jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  app: jest.fn(() => ({})),
  firestore: () => ({
    collection: mockCollection,
  }),
  auth: () => ({
    verifyIdToken: jest.fn().mockResolvedValue({ uid: "mock-user" }),
  }),
}));

describe("GET /api/cfo/summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna KPIs e DRE com sucesso", async () => {
    mockGet.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            tenantId: "default",
            amount: 1000,
            type: "income",
            createdAt: new Date().toISOString(),
          }),
        },
        {
          data: () => ({
            tenantId: "default",
            amount: 500,
            type: "expense",
            createdAt: new Date().toISOString(),
          }),
        },
      ],
    });

    const app = makeTestApp();
    const res = await request(app).get("/api/cfo/summary");
    await debugIfNotOk(res);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
