"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateScenario = simulateScenario;
function simulateScenario(baseIncome, baseExpense, input) {
    const inc = baseIncome * (1 + (input.incDeltaPct || 0) / 100) +
        (input.oneOffIncome || 0);
    const exp = baseExpense * (1 + (input.expDeltaPct || 0) / 100) +
        (input.oneOffExpense || 0);
    return {
        newIncome: Number(inc.toFixed(2)),
        newExpense: Number(exp.toFixed(2)),
        net: Number((inc - exp).toFixed(2)),
    };
}
