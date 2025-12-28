"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandInstallments = expandInstallments;
const cards_1 = require("./cards");
const crypto_1 = require("crypto");
const logger_1 = require("../../utils/logger");
async function expandInstallments(userId, transaction) {
    const { amount, installments, paymentMethod, date, description, type, category } = transaction;
    const purchaseDate = date ? new Date(date) : new Date();
    if (!installments || installments < 2 || !paymentMethod) {
        return [{
                id: (0, crypto_1.randomUUID)(),
                ...transaction,
                date: purchaseDate.toISOString().split("T")[0],
                dateOfPayment: purchaseDate.toISOString().split("T")[0],
                status: "pending",
                amount: type === "Expense" ? -Math.abs(amount) : Math.abs(amount),
                subType: category,
            }];
    }
    try {
        const card = await (0, cards_1.getCardByName)(userId, paymentMethod);
        const firstPaymentDate = (0, cards_1.calculateNextPaymentDate)(purchaseDate, card.closingDay, card.dueDay);
        const perInstallmentAmount = +(amount / installments).toFixed(2);
        const expanded = [];
        for (let i = 0; i < installments; i++) {
            const paymentDate = new Date(firstPaymentDate);
            paymentDate.setMonth(paymentDate.getMonth() + i);
            expanded.push({
                id: (0, crypto_1.randomUUID)(),
                description,
                amount: type === "Expense" ? -Math.abs(perInstallmentAmount) : Math.abs(perInstallmentAmount),
                type,
                subType: category,
                installment: { number: i + 1, total: installments },
                dateOfPurchase: purchaseDate.toISOString().split("T")[0],
                dateOfPayment: paymentDate.toISOString().split("T")[0],
                date: paymentDate.toISOString().split("T")[0],
                paymentMethod,
                status: 'pending',
            });
        }
        return expanded;
    }
    catch (error) {
        logger_1.logger.error("Failed to expand installments, likely missing card profile. Defaulting to single transaction.", { userId, paymentMethod, error });
        return [{
                id: (0, crypto_1.randomUUID)(),
                ...transaction,
                date: purchaseDate.toISOString().split("T")[0],
                dateOfPayment: purchaseDate.toISOString().split("T")[0],
                status: "review", // Mark for review since card was not found
                amount: type === "Expense" ? -Math.abs(amount) : Math.abs(amount),
                subType: category,
            }];
    }
}
