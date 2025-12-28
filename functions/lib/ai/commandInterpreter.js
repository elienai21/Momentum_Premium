"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tools = exports.getBalanceTool = exports.addTransactionTool = void 0;
exports.executeCommand = executeCommand;
const genai_1 = require("@google/genai");
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const firestore_1 = require("../core/adapters/firestore");
const AddTransactionArgsSchema = zod_1.z.object({
    description: zod_1.z.string().min(1),
    amount: zod_1.z.number().or(zod_1.z.string().transform(v => parseFloat(String(v).replace(/[^0-9.,-]/g, '').replace(',', '.')))),
    category: zod_1.z.string().default('Outros'),
    type: zod_1.z.enum(['Income', 'Expense']),
});
// As declarações de ferramentas são exportadas para consistência, embora não sejam usadas diretamente por outros módulos do backend.
// O frontend replicará estas definições para iniciar a sessão do Live API.
exports.addTransactionTool = {
    name: "addTransaction",
    description: "Registra uma nova transação de receita ou despesa.",
    parameters: {
        type: genai_1.Type.OBJECT,
        properties: {
            description: { type: genai_1.Type.STRING, description: "A descrição da transação." },
            amount: { type: genai_1.Type.NUMBER, description: "O valor numérico da transação." },
            type: { type: genai_1.Type.STRING, enum: ["Income", "Expense"], description: "O tipo da transação." },
            category: { type: genai_1.Type.STRING, description: "A categoria da transação (ex: Alimentação, Salário)." },
        },
        required: ["description", "amount", "type", "category"],
    },
};
exports.getBalanceTool = {
    name: "getBalance",
    description: "Obtém o saldo atual da conta do usuário.",
    parameters: { type: genai_1.Type.OBJECT, properties: {} },
};
exports.tools = [{ functionDeclarations: [exports.addTransactionTool, exports.getBalanceTool] }];
/**
 * Executa um comando que já foi interpretado pelo Gemini a partir de uma chamada de função.
 * @param uid O ID do usuário.
 * @param tenantId O ID do tenant do usuário.
 * @param command O objeto do comando contendo nome e argumentos.
 * @returns Um objeto com o resultado da execução.
 */
async function executeCommand(uid, tenantId, command) {
    const { name, args } = command;
    logger_1.logger.info("Executing command via Firestore", { name, args, uid, tenantId });
    try {
        const db = new firestore_1.FirestoreAdapter(tenantId);
        if (name === "addTransaction") {
            const transactionData = AddTransactionArgsSchema.parse(args);
            await db.addRecord(uid, transactionData);
            return { result: `Ok, transação de ${transactionData.description} no valor de R$${transactionData.amount} foi registrada.` };
        }
        if (name === "getBalance") {
            const data = await db.getDashboardData();
            return { result: `Seu saldo atual é de R$${data.currentBalance.toFixed(2)}.` };
        }
        throw new errors_1.ApiError(400, `Comando "${name}" não encontrado.`);
    }
    catch (error) {
        logger_1.logger.error("Command execution failed", { error, name, args });
        if (error instanceof errors_1.ApiError)
            throw error;
        // Check if it's a Zod error to provide a more specific message
        if (error instanceof zod_1.z.ZodError) {
            logger_1.logger.error("Invalid AI args for addTransaction", { errors: error.format(), originalArgs: args });
            throw new errors_1.ApiError(400, "Parâmetros inválidos retornados pela IA para adicionar transação.");
        }
        throw new errors_1.ApiError(500, `Falha ao executar o comando "${name}".`);
    }
}
