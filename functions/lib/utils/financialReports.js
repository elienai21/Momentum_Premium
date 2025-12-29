"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calcKPIs = calcKPIs;
exports.generateDRE = generateDRE;
function calcKPIs(transactions) {
    const revenue = sum(transactions.filter(t => t.type === "credit"));
    const expense = sum(transactions.filter(t => t.type === "debit"));
    const profit = revenue - expense;
    const margin = revenue > 0 ? +((profit / revenue) * 100).toFixed(2) : 0;
    return { revenue, expense, profit, margin };
}
function generateDRE(transactions) {
    const { revenue, expense, profit, margin } = calcKPIs(transactions);
    const byCategory = groupAmounts(transactions.filter(t => t.type === "debit"));
    const custos = pick(byCategory, ["Custo de Vendas", "Operacional", "Pessoal"]);
    const despesasOutras = Object.fromEntries(Object.entries(byCategory).filter(([k]) => !(k in custos)));
    return {
        periodo: "mensal",
        receitaBruta: revenue,
        custos: sumMap(custos),
        despesas: sumMap(despesasOutras),
        lucroLiquido: profit,
        margemPercentual: margin,
        breakdown: { custos, despesasOutras },
    };
}
function sum(list) { return list.reduce((s, t) => s + (Number(t.amount) || 0), 0); }
function groupAmounts(list) {
    return list.reduce((acc, t) => {
        const key = t.category || "Outros";
        acc[key] = (acc[key] || 0) + (Number(t.amount) || 0);
        return acc;
    }, {});
}
function sumMap(m) {
    return Object.values(m).reduce((s, v) => s + (Number(v) || 0), 0);
}
function pick(obj, keys) {
    const out = {};
    for (const k of keys)
        if (obj[k] != null)
            out[k] = obj[k];
    return out;
}
