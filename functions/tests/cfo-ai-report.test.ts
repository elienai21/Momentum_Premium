import "./setupFirebaseMock";
import request from "supertest";
import { makeTestApp, debugIfNotOk } from "./helpers/testApp";
import { __resetMocks } from "./helpers/firebaseMock";

jest.mock("src/cfo/aiReport", () => ({
  generateCfoAiReport: jest.fn(async () => ({
    report: "mock-report",
    meta: { provider: "mock", tokens: 10 },
  })),
}));

jest.mock("src/utils/usageTracker", () => ({
  reportUsageToStripe: jest.fn(async () => Promise.resolve()),
}));

const mockAdd = jest.fn();
jest.mock("src/services/firebase", () => {
  const base = jest.requireActual("src/services/firebase");
  return {
    ...base,
    db: {
      collection: jest.fn(() => ({
        add: mockAdd,
        doc: jest.fn(() => ({
          set: jest.fn(async () => undefined),
        })),
      })),
    },
  };
});

import { generateCfoAiReport } from "src/cfo/aiReport";

describe("POST /api/cfo/ai-report", () => {
  beforeEach(() => {
    __resetMocks();
    jest.clearAllMocks();
  });

  it("executa AI report com provider openai", async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post("/api/cfo/ai-report")
      .set("x-test-plan", "enterprise")
      .send({ provider: "openai", prompt: "Analise meu fluxo de caixa" });
    await debugIfNotOk(res);

    expect(res.status).toBe(200);
    expect(res.body.report).toBe("mock-report");
    expect((generateCfoAiReport as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect(mockAdd).toHaveBeenCalled(); // usage log
  });

  it("executa AI report com provider gemini", async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post("/api/cfo/ai-report")
      .set("x-test-plan", "enterprise")
      .send({ provider: "gemini", prompt: "Quais riscos imediatos?" });
    await debugIfNotOk(res);

    expect(res.status).toBe(200);
    expect(res.body.report).toBe("mock-report");
    expect(mockAdd).toHaveBeenCalled();
  });

  it("nega acesso quando plano é free (gating)", async () => {
    const app = makeTestApp();
    const res = await request(app)
      .post("/api/cfo/ai-report")
      .set("x-test-plan", "free")
      .send({ provider: "openai", prompt: "Teste" });
    await debugIfNotOk(res);
    expect(res.status).toBe(403);
  });
});
