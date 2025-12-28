// src/components/__tests__/SimulateScenarioModal.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, type Mock } from "vitest";
import SimulateScenarioModal from "../SimulateScenarioModal";
import { ToastProvider } from "../Toast";
import { simulateScenario } from "../../services/pulseApi";

// Mock da função de simulação usando Vitest
vi.mock("../../services/pulseApi", () => ({
  simulateScenario: vi.fn(),
}));

const mockSimulateScenario = simulateScenario as unknown as Mock;

const baseline = {
  cashBalance: 100000,
  revenueMonth: 20000,
  expenseMonth: 5000,
  runwayMonths: 12,
};

describe("SimulateScenarioModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays parameters and simulates scenario correctly", async () => {
    mockSimulateScenario.mockResolvedValue({
      baseline: { cash: 100000, runwayMonths: 12 },
      scenario: { cash: 105000, runwayMonths: 14 },
      deltas: { cash: 5000, runwayMonths: 2 },
    });

    render(
      <ToastProvider>
        <SimulateScenarioModal
          open={true}
          onClose={() => {}}
          baseline={baseline}
        />
      </ToastProvider>,
    );

    // Modal abre com título e parâmetros
    expect(screen.getByText("Simular cenário")).toBeInTheDocument();
    expect(screen.getByText("Parâmetros")).toBeInTheDocument();
    expect(screen.getByText("Saldo de Caixa")).toBeInTheDocument();

    // Clica em "Aplicar Simulação"
    fireEvent.click(screen.getByText("Aplicar Simulação"));

    // Garante que a API foi chamada
    await waitFor(() => {
      expect(mockSimulateScenario).toHaveBeenCalledTimes(1);
    });

    // Garante que o toast de sucesso aparece
    await waitFor(() => {
      expect(
        screen.getByText("Simulação aplicada com sucesso"),
      ).toBeInTheDocument();
    });
  });

  it("displays error toast if simulation fails", async () => {
    mockSimulateScenario.mockRejectedValue(new Error("Simulação falhou"));

    render(
      <ToastProvider>
        <SimulateScenarioModal
          open={true}
          onClose={() => {}}
          baseline={baseline}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Aplicar Simulação"));

    // Verifica se o toast de erro aparece
    await waitFor(() => {
      expect(
        screen.getByText("Falha ao simular cenário"),
      ).toBeInTheDocument();
    });
  });
});
