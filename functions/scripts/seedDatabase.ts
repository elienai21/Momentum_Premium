import * as admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// CONFIGURAÇÃO
// Certifique-se de baixar sua chave de serviço do console do Firebase
// e salvar como functions/serviceAccountKey.json
const serviceAccount = require('../serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

// CONSTANTES DO CENÁRIO
const TENANT_ID = 'demo-tenant-001';
const USER_UID = 'user_admin_demo'; // Substitua pelo SEU UID real do Authentication para conseguir logar
const USER_EMAIL = 'admin@momentum.demo';

interface Transaction {
  description: string;
  amount: number;
  type: 'Income' | 'Expense'; // Note que seu front usa Income/Expense com capital
  category: string;
  date: string; // YYYY-MM-DD
  status: 'paid' | 'pending';
  tenantId: string;
  userId: string;
  createdAt: string;
}

const CATEGORIES = {
  Income: ['Venda de Serviços', 'Assinatura SaaS', 'Consultoria', 'Setup Fee'],
  Expense: ['Servidores AWS', 'Marketing Ads', 'Salários', 'Software', 'Impostos', 'Aluguel']
};

// UTILITÁRIOS
const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function seedDatabase() {
  console.log(`🌱 Iniciando Seed para Tenant: ${TENANT_ID}...`);
  const batchLimit = 400;
  let batch = db.batch();
  let operationCounter = 0;

  // 1. CRIAR OU ATUALIZAR TENANT
  console.log('🏢 Criando Tenant e Vínculos...');
  const tenantRef = db.collection('tenants').doc(TENANT_ID);
  batch.set(tenantRef, {
    name: 'Momentum Demo Corp',
    planId: 'pro', // Habilita features premium
    ownerUid: USER_UID,
    vertical: 'finance',
    createdAt: new Date().toISOString(),
    features: { cfo: true, pulse: true, ai: true }
  }, { merge: true });

  // 2. CRIAR MEMBRO (Para passar no middleware withTenant)
  const memberRef = tenantRef.collection('members').doc(USER_UID);
  batch.set(memberRef, {
    role: 'admin',
    email: USER_EMAIL,
    joinedAt: new Date().toISOString()
  });

  // 3. LIMPAR TRANSAÇÕES ANTIGAS (Opcional, cuidado em prod)
  const oldTxs = await tenantRef.collection('transactions').get();
  if (!oldTxs.empty) {
    console.log(`🧹 Removendo ${oldTxs.size} transações antigas...`);
    // Delete em chunks para não estourar memória local
    for (const doc of oldTxs.docs) {
      await doc.ref.delete();
    }
  }

  await batch.commit(); // Commit inicial de estrutura
  batch = db.batch(); // Reinicia batch

  // 4. GERAR HISTÓRICO DE 6 MESES
  console.log('📈 Gerando Transações Financeiras...');
  
  const today = new Date();
  const startDate = new Date();
  startDate.setMonth(today.getMonth() - 6);
  startDate.setDate(1);

  let currentBalance = 15000; // Começa com caixa de 15k
  let totalRecords = 0;

  // Simulação dia a dia
  for (let d = 0; d < 180; d++) {
    const currentDate = addDays(startDate, d);
    
    // Ignora futuro
    if (currentDate > today) break;

    // Fator de crescimento: a empresa melhora 10% ao mês
    const monthIndex = Math.floor(d / 30);
    const growthFactor = 1 + (monthIndex * 0.15);

    // Número de transações no dia (aleatório, maior em dias úteis)
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const numTrans = isWeekend ? getRandomInt(0, 1) : getRandomInt(2, 6);

    for (let t = 0; t < numTrans; t++) {
      // Lógica de Negócio:
      // Meses 0-2: Burn rate alto (Investimento)
      // Meses 3-5: Break-even e Lucro
      
      const isEarlyStage = monthIndex < 3;
      const randomChance = Math.random();
      
      let type: 'Income' | 'Expense';
      
      // No começo gasta mais, depois ganha mais
      if (isEarlyStage) {
        type = randomChance > 0.35 ? 'Expense' : 'Income'; 
      } else {
        type = randomChance > 0.3 ? 'Income' : 'Expense';
      }

      // Valores
      let amount = 0;
      let category = '';

      if (type === 'Income') {
        amount = getRandomInt(800, 3000) * growthFactor;
        category = CATEGORIES.Income[getRandomInt(0, CATEGORIES.Income.length - 1)];
      } else {
        amount = getRandomInt(200, 1500); 
        category = CATEGORIES.Expense[getRandomInt(0, CATEGORIES.Expense.length - 1)];
      }

      // Folha de pagamento (Dia 5)
      if (currentDate.getDate() === 5 && t === 0) {
        type = 'Expense';
        amount = 12000 + (monthIndex * 1000); // Equipe cresce
        category = 'Salários';
      }

      // Ajuste de sinal (Backend geralmente espera positivo e o tipo define, mas vamos seguir o padrão do seu adapter)
      // O seu FirestoreAdapter no 'pulse.ts' parece lidar com amount positivo e checar o type.
      // Porém, para garantir:
      const signedAmount = type === 'Expense' ? -Math.abs(amount) : Math.abs(amount);
      
      currentBalance += signedAmount;

      const txData: Transaction = {
        description: `${type === 'Income' ? 'Recebimento' : 'Pagto'} - ${category}`,
        amount: signedAmount, // Salvando com sinal para facilitar somas simples
        type,
        category,
        date: currentDate.toISOString().split('T')[0],
        status: currentDate < today ? 'paid' : 'pending',
        tenantId: TENANT_ID,
        userId: USER_UID,
        createdAt: new Date().toISOString()
      };

      const docRef = tenantRef.collection('transactions').doc();
      batch.set(docRef, txData);
      
      operationCounter++;
      totalRecords++;

      if (operationCounter >= batchLimit) {
        await batch.commit();
        batch = db.batch();
        operationCounter = 0;
        process.stdout.write('.');
      }
    }
  }

  // Commit final
  if (operationCounter > 0) {
    await batch.commit();
  }

  // 5. ATUALIZAR UM SNAPSHOT DE CACHE (Para evitar ler tudo na próxima)
  // Isso ajuda o seu endpoint pulse.ts se você implementar leitura de cache
  await tenantRef.collection('analytics').doc('snapshot_latest').set({
    finalBalance: currentBalance,
    lastUpdate: new Date().toISOString(),
    recordCount: totalRecords
  });

  console.log('\n✅ Seed Concluído!');
  console.log(`📊 Transações geradas: ${totalRecords}`);
  console.log(`💰 Saldo Final Simulado: R$ ${currentBalance.toFixed(2)}`);
  console.log(`🔑 Tenant ID: ${TENANT_ID}`);
}

seedDatabase().catch(console.error);