import { createExpressApp } from "../../src/app/createExpressApp";

type TestOpts = {
  auth?: "mock" | "real";
  tenant?: "mock" | "real";
};

export function makeTestApp(_opts?: TestOpts) {
  // Real auth/tenant só se setado antes de rodar os testes (TEST_REAL_AUTH)
  return createExpressApp({ mode: "test" });
}

export async function debugIfNotOk(res: any) {
  if (res.status >= 400) {
    // eslint-disable-next-line no-console
    console.log("[TEST_DEBUG] status/body", res.status, res.body);
  }
}
