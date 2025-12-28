import { describe, it, expect } from "vitest";

describe("smoke tests", () => {
  it("health check: trivial math should pass", () => {
    expect(2 + 2).toBe(4);
  });
});
