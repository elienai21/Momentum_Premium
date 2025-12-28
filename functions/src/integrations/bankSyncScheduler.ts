// functions/src/integrations/bankSyncScheduler.ts
//
// ⛔ MOCK DESATIVADO
// Este scheduler existia apenas para injetar dados fake de Open Finance
// (Padaria Pão Quente, Salário etc.). Para evitar "sujar" o extrato de
// clientes reais, ele foi transformado em NO-OP até a integração real.
//
// Quando a API de Open Finance estiver pronta, você pode reativar aqui
// chamando o serviço real em vez do mock.

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

// Mantemos o export para não quebrar o index.ts,
// mas a função NÃO chama mais o mock de openFinance.
export const dailyBankSync = onSchedule(
  {
    schedule: "0 4 * * *", // horário irrelevante por enquanto
    timeZone: "America/Sao_Paulo",
  },
  async () => {
    logger.info(
      "[dailyBankSync] Scheduler ativo, mas MOCK de Open Finance está DESATIVADO. Nenhuma transação fake será criada."
    );
    // NO-OP: não faz nada além de logar
    return;
  }
);
