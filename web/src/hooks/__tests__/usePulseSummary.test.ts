import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { usePulseSummary } from "../usePulseSummary";
import { getPulseSummary } from "../../services/pulseApi";

vi.mock("../../services/pulseApi", () => ({
  getPulseSummary: vi.fn(),
}));

const mockGetPulseSummary = getPulseSummary as any;

const baseParams = {
  tenantId: "T1",
  periodStart: "2025-11-09",
  periodEnd: "2025-11-16",
};

describe("usePulseSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna dados quando a API resolve com sucesso", async () => {
    mockGetPulseSummary.mockResolvedValueOnce({
      hasData: true,
      kpis: {
        cashBalance: 1000,
        revenueMonth: 2000,
        expenseMonth: 1500,
        runwayMonths: 6,
      },
    });

    const { result } = renderHook(() => usePulseSummary(baseParams));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).not.toBeNull();
    expect(result.current.empty).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("marca como empty quando a API retorna sem dados", async () => {
    mockGetPulseSummary.mockResolvedValueOnce({
      hasData: false,
    });

    const { result } = renderHook(() => usePulseSummary(baseParams));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.empty).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("marca erro quando a API falha", async () => {
    mockGetPulseSummary.mockRejectedValueOnce(new Error("Network Error"));

    const { result } = renderHook(() => usePulseSummary(baseParams));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.empty).toBe(false);
  });
});
