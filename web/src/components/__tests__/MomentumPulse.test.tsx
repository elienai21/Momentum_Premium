import { render, screen } from "@testing-library/react";
import MomentumPulse from "../MomentumPulse";
import type { PulseSummary } from "../../services/pulseApi";

describe("<MomentumPulse />", () => {
  test("renderiza estado de carregamento (skeletons)", () => {
    const { getAllByTestId } = render(
      <MomentumPulse
        data={null}
        loading={true}
        error={null}
        empty={false}
      />,
    );

    const skeletons = getAllByTestId("kpi-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test("renderiza estado de erro", () => {
    render(
      <MomentumPulse
        data={null}
        loading={false}
        error={new Error("erro de teste")}
        empty={false}
      />,
    );

    expect(
      screen.getByText(/Algo não saiu como esperado/i),
    ).toBeInTheDocument();
  });

  test("renderiza dados reais", () => {
    const sample: PulseSummary = {
      hasData: true,
      kpis: {
        cashBalance: 240300,
        revenueMonth: 120000,
        expenseMonth: 98500,
        runwayMonths: 8.4,
      },
    } as any;

    render(
      <MomentumPulse
        data={sample}
        loading={false}
        error={null}
        empty={false}
      />,
    );

    expect(screen.getByText(/Saldo em caixa/i)).toBeInTheDocument();
    expect(screen.getByText(/Receita do mês/i)).toBeInTheDocument();
    expect(screen.getByText(/Despesas do mês/i)).toBeInTheDocument();
  });
});
