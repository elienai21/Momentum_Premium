import { jest, afterEach, afterAll } from "@jest/globals";
import "./setupFirebaseMock";

// Em CI/Windows, inicialização do app + mocks pode levar mais de 5s.
jest.setTimeout(30_000);
// Mock aiClient para evitar dependência de chaves externas
jest.mock("src/utils/aiClient", () => ({
  aiClient: jest.fn(async (_prompt: string, _opts?: any) => ({
    text: "mock-ai-response",
    tokens: 10,
    provider: "mock",
  })),
}));

const REAL_AUTH = process.env.TEST_REAL_AUTH === "true";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";

if (!REAL_AUTH) {
  jest.mock("src/middleware/requireAuth", () => ({
    requireAuth: (req: any, _res: any, next: any) => {
      const uid = (req.headers["x-test-uid"] as string) || "test-uid";
      req.user = {
        uid,
        email: `${uid}@example.com`,
        isAdmin: true,
      };
      next();
    },
  }));

  jest.mock("src/middleware/withTenant", () => ({
    withTenant: (req: any, _res: any, next: any) => {
      const planHeader = (req.headers["x-test-plan"] as string) || "enterprise";
      req.tenant = {
        id: "test-tenant",
        info: {
          id: "test-tenant",
          plan: planHeader,
          locale: "pt-BR",
          features: {},
        },
        member: {
          uid: req.user?.uid || "test-uid",
          role: "admin",
          status: "active",
        },
      };
      next();
    },
  }));
}

afterEach(() => {
  try {
    const mockAdmin = require("firebase-admin");
    mockAdmin.__resetMocks?.();
  } catch {
    // ignore if mock not loaded
  }
  jest.clearAllMocks();
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
});
