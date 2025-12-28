import { db } from "src/services/firebase";

import { getCardByName, calculateNextPaymentDate } from "./cards";
import { Transaction, RecordItem } from "../../types";
import { randomUUID } from "crypto";
import { logger } from "../../utils/logger";

export async function expandInstallments(
    userId: string,
    transaction: Transaction
): Promise<Partial<RecordItem>[]> {
    const { amount, installments, paymentMethod, date, description, type, category } = transaction;

    const purchaseDate = date ? new Date(date) : new Date();

    if (!installments || installments < 2 || !paymentMethod) {
        return [{
            id: randomUUID(),
            ...transaction,
            date: purchaseDate.toISOString().split("T")[0],
            dateOfPayment: purchaseDate.toISOString().split("T")[0],
            status: "pending",
            amount: type === "Expense" ? -Math.abs(amount) : Math.abs(amount),
            subType: category,
        }];
    }

    try {
        const card = await getCardByName(userId, paymentMethod);
        const firstPaymentDate = calculateNextPaymentDate(purchaseDate, card.closingDay, card.dueDay);

        const perInstallmentAmount = +(amount / installments).toFixed(2);

        const expanded: Partial<RecordItem>[] = [];
        for (let i = 0; i < installments; i++) {
            const paymentDate = new Date(firstPaymentDate);
            paymentDate.setMonth(paymentDate.getMonth() + i);
            
            expanded.push({
                id: randomUUID(),
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
    } catch (error) {
        logger.error("Failed to expand installments, likely missing card profile. Defaulting to single transaction.", { userId, paymentMethod, error });
        return [{
             id: randomUUID(),
            ...transaction,
            date: purchaseDate.toISOString().split("T")[0],
            dateOfPayment: purchaseDate.toISOString().split("T")[0],
            status: "review", // Mark for review since card was not found
            amount: type === "Expense" ? -Math.abs(amount) : Math.abs(amount),
            subType: category,
        }];
    }
}



