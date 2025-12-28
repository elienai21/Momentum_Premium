import { db } from "src/services/firebase";


import { CardProfile } from "../../types";
import { ApiError } from "../../utils/errors";

const getCollection = (userId: string) => db.collection(`users/${userId}/cards`);

export async function createCard(userId: string, tenantId: string, data: Omit<CardProfile, "id" | "userId" | "tenantId">): Promise<CardProfile> {
  const card: Omit<CardProfile, "id"> = { ...data, userId, tenantId };
  const ref = await getCollection(userId).add(card);
  return { id: ref.id, ...card };
}

export async function updateCard(userId: string, cardId: string, data: Partial<CardProfile>): Promise<void> {
    await getCollection(userId).doc(cardId).update(data);
}

export async function deleteCard(userId: string, cardId: string): Promise<void> {
    await getCollection(userId).doc(cardId).delete();
}

export async function getCards(userId: string): Promise<CardProfile[]> {
  const snapshot = await getCollection(userId).orderBy("name").get();
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as CardProfile));
}

export async function getCardByName(userId: string, name: string): Promise<CardProfile> {
  const snap = await getCollection(userId).where("name", "==", name).limit(1).get();
  if (snap.empty) {
    throw new ApiError(404, `Cartão com o nome "${name}" não foi encontrado.`);
  }
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as CardProfile;
}

export function calculateNextPaymentDate(purchaseDate: Date, closingDay: number, dueDay: number): Date {
  const paymentDueDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), 1);

  // If purchase is on or after the closing day of its month, the invoice is for the next month.
  if (purchaseDate.getDate() >= closingDay) {
    paymentDueDate.setMonth(paymentDueDate.getMonth() + 1);
  }

  paymentDueDate.setDate(dueDay);
  return paymentDueDate;
}



