import { db } from "src/services/firebase";

export type ScenarioInput = {
  incDeltaPct?: number;
  expDeltaPct?: number;
  oneOffIncome?: number;
  oneOffExpense?: number;
};

export type ScenarioResult = {
  newIncome: number;
  newExpense: number;
  net: number;
};

export function simulateScenario(
  baseIncome: number,
  baseExpense: number,
  input: ScenarioInput
): ScenarioResult {
  const inc =
    baseIncome * (1 + (input.incDeltaPct || 0) / 100) +
    (input.oneOffIncome || 0);
  const exp =
    baseExpense * (1 + (input.expDeltaPct || 0) / 100) +
    (input.oneOffExpense || 0);
  return {
    newIncome: Number(inc.toFixed(2)),
    newExpense: Number(exp.toFixed(2)),
    net: Number((inc - exp).toFixed(2)),
  };
}

