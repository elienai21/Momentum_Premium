"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCard = createCard;
exports.updateCard = updateCard;
exports.deleteCard = deleteCard;
exports.getCards = getCards;
exports.getCardByName = getCardByName;
exports.calculateNextPaymentDate = calculateNextPaymentDate;
const firebase_1 = require("src/services/firebase");
const errors_1 = require("../../utils/errors");
const getCollection = (userId) => firebase_1.db.collection(`users/${userId}/cards`);
async function createCard(userId, tenantId, data) {
    const card = { ...data, userId, tenantId };
    const ref = await getCollection(userId).add(card);
    return { id: ref.id, ...card };
}
async function updateCard(userId, cardId, data) {
    await getCollection(userId).doc(cardId).update(data);
}
async function deleteCard(userId, cardId) {
    await getCollection(userId).doc(cardId).delete();
}
async function getCards(userId) {
    const snapshot = await getCollection(userId).orderBy("name").get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
async function getCardByName(userId, name) {
    const snap = await getCollection(userId).where("name", "==", name).limit(1).get();
    if (snap.empty) {
        throw new errors_1.ApiError(404, `Cartão com o nome "${name}" não foi encontrado.`);
    }
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
}
function calculateNextPaymentDate(purchaseDate, closingDay, dueDay) {
    const paymentDueDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 1);
    // If purchase is on or after the closing day of its month, the invoice is for the next month.
    if (purchaseDate.getDate() >= closingDay) {
        paymentDueDate.setMonth(paymentDueDate.getMonth() + 1);
    }
    paymentDueDate.setDate(dueDay);
    return paymentDueDate;
}
