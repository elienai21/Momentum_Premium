import { db } from "src/services/firebase";
import { FunctionDeclaration, Tool, Type } from "@google/genai";
import { z } from "zod";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/errors";
import { Transaction } from "../types";
import { FirestoreAdapter } from "../core/adapters/firestore";

const AddTransactionArgsSchema = z.object({
    description: z.string().min(1),
    amount: z.number().or(z.string().transform(v => parseFloat(String(v).replace(/[^0-9.,-]/g, '').replace(',', '.')))),
    category: z.string().default('Outros'),
    type: z.enum(['Income', 'Expense']),
});

// As declarações de ferramentas são exportadas para consistência, embora não sejam usadas diretamente por outros módulos do backend.
// O frontend replicará estas definições para iniciar a sessão do Live API.
export const addTransactionTool: FunctionDeclaration = {
    name: "addTransaction",
    description: "Registra uma nova transação de receita ou despesa.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: "A descrição da transação." },
            amount: { type: Type.NUMBER, description: "O valor numérico da transação." },
            type: { type: Type.STRING, enum: ["Income", "Expense"], description: "O tipo da transação." },
            category: { type: Type.STRING, description: "A categoria da transação (ex: Alimentação, Salário)." },
        },
        required: ["description", "amount", "type", "category"],
    },
};

export const getBalanceTool: FunctionDeclaration = {
    name: "getBalance",
    description: "Obtém o saldo atual da conta do usuário.",
    parameters: { type: Type.OBJECT, properties: {} },
};

export const tools: Tool[] = [{ functionDeclarations: [addTransactionTool, getBalanceTool] }];

/**
 * Executa um comando que já foi interpretado pelo Gemini a partir de uma chamada de função.
 * @param uid O ID do usuário.
 * @param tenantId O ID do tenant do usuário.
 * @param command O objeto do comando contendo nome e argumentos.
 * @returns Um objeto com o resultado da execução.
 */
export async function executeCommand(
    uid: string,
    tenantId: string,
    command: { name: string; args: any; }
): Promise<{ result: any }> {
    const { name, args } = command;
    logger.info("Executing command via Firestore", { name, args, uid, tenantId });

    try {
        const db = new FirestoreAdapter(tenantId);

        if (name === "addTransaction") {
            const transactionData = AddTransactionArgsSchema.parse(args);
            await db.addRecord(uid, transactionData as Transaction);
            return { result: `Ok, transação de ${transactionData.description} no valor de R$${transactionData.amount} foi registrada.` };
        }

        if (name === "getBalance") {
            const data = await db.getDashboardData();
            return { result: `Seu saldo atual é de R$${data.currentBalance.toFixed(2)}.` };
        }

        throw new ApiError(400, `Comando "${name}" não encontrado.`);
    } catch (error) {
        logger.error("Command execution failed", { error, name, args });
        if (error instanceof ApiError) throw error;
        // Check if it's a Zod error to provide a more specific message
        if (error instanceof z.ZodError) {
            logger.error("Invalid AI args for addTransaction", { errors: error.format(), originalArgs: args });
            throw new ApiError(400, "Parâmetros inválidos retornados pela IA para adicionar transação.");
        }
        throw new ApiError(500, `Falha ao executar o comando "${name}".`);
    }
}



