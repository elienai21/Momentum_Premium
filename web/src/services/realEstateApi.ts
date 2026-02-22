// web/src/services/realEstateApi.ts
import { api } from "./api";

export interface Building {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  active: boolean;
  createdAt: string;
}

export interface Unit {
  id: string;
  ownerId: string;
  buildingId?: string;
  code: string;
  name?: string;
  bedrooms?: number;
  bathrooms?: number;
  active: boolean;
}

export interface Contract {
  id: string;
  unitId: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  readjustmentIndex?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioSummary {
  totals: {
    activeOwners: number;
    totalUnits: number;
    activeUnits: number;
    grossRevenue: number;
    netRevenue: number;
    totalExpenses: number;
    staysCount: number;
  };
  period: {
    start: string;
    end: string;
  };
  potentialCharges?: {
    ownerFee: number;
    unitFee: number;
    total: number;
  };
}

export async function getPortfolioSummary(days = 30): Promise<PortfolioSummary> {
  const res = await api.get<{ ok: boolean; summary: PortfolioSummary }>(
    `/realestate/portfolio-summary?days=${days}`
  );
  return res.data.summary;
}

export async function listBuildings(): Promise<Building[]> {
  const res = await api.get<{ ok: boolean; buildings: Building[] }>(
    "/realestate/buildings"
  );
  return res.data.buildings;
}

export async function listUnits(): Promise<Unit[]> {
  const res = await api.get<{ ok: boolean; units: Unit[] }>(
    "/realestate/units"
  );
  return res.data.units;
}

export interface Owner {
  id: string;
  name: string;
  email?: string;
}

export async function listOwners(): Promise<Owner[]> {
  const res = await api.get<{ ok: boolean; owners: Owner[] }>(
    "/realestate/owners"
  );
  return res.data.owners;
}

export async function createOwner(data: { name: string; email?: string; phone?: string }): Promise<Owner> {
  const res = await api.post<{ ok: boolean; owner: Owner }>(
    "/realestate/owners",
    data
  );
  return res.data.owner;
}

export async function createUnit(data: Partial<Unit>): Promise<Unit> {
  const res = await api.post<{ ok: boolean; unit: Unit }>(
    "/realestate/units",
    data
  );
  return res.data.unit;
}

export async function createBuilding(data: Partial<Building>): Promise<Building> {
  const res = await api.post<{ ok: boolean; building: Building }>(
    "/realestate/buildings",
    data
  );
  return res.data.building;
}

export async function listContracts(unitId?: string): Promise<Contract[]> {
  const res = await api.get<{ ok: boolean; contracts: Contract[] }>(
    "/realestate/contracts",
    { params: unitId ? { unitId } : undefined }
  );
  return res.data.contracts;
}

export async function createContract(data: Omit<Contract, "id">): Promise<Contract> {
  const res = await api.post<{ ok: boolean; contract: Contract }>(
    "/realestate/contracts",
    data
  );
  return res.data.contract;
}

export async function updateContract(id: string, data: Partial<Contract>): Promise<void> {
  await api.put(`/realestate/contracts/${id}`, data);
}

export interface RealEstatePayoutDoc {
  id: string;
  month: string;
  unitCode: string;
  ownerId?: string;
  ownerName?: string;
  grossRevenue: number;
  platformFees: number;
  cleaningFees: number;
  otherCosts: number;
  ownerPayout: number;
  vivarePayout: number;
}

export type RealEstatePayoutsResult = RealEstatePayoutDoc[];

export async function getRealEstatePayouts(params: {
  tenantId: string;
  month?: string;
}): Promise<RealEstatePayoutsResult> {
  const { tenantId, month } = params;
  const res = await api.get<{ ok: boolean; payouts: RealEstatePayoutsResult }>(
    "/realestate/payouts",
    { params: { tenantId, month } }
  );
  return res.data.payouts;
}

export interface RealEstateDocument {
  id: string;
  title: string;
  docType: string;
  fileName: string;
  storagePath: string;
  status: "active" | "archived";
  version: number;
  validUntil?: string | null;
  downloadUrl?: string;
  createdAt: string;
}

export interface OwnerStatement {
  id: string;
  ownerId: string;
  period: string;
  totals: {
    income: number;
    expenses: number;
    fees: number;
    net: number;
  };
  status: "ready" | "failed";
  htmlPath?: string;
  htmlUrl?: string;
  generatedAt?: string;
}

export interface Receivable {
  id: string;
  contractId: string;
  unitId: string;
  ownerId: string;
  tenantName?: string;
  period: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  status: "open" | "partial" | "paid" | "overdue" | "renegotiated";
  paidAt?: string | null;
}

export interface AgingSnapshot {
  asOfDate: string;
  buckets: {
    d0_30: { total: number; count: number };
    d31_60: { total: number; count: number };
    d61_90: { total: number; count: number };
    d90_plus: { total: number; count: number };
  };
}

// Real Estate API helpers
export const realEstateApi = {
  // existing helpers can stay exported individually above
  documents: {
    initUpload: async (data: {
      linkedEntityType: string;
      linkedEntityId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      title: string;
      docType: string;
      validUntil?: string;
      tags?: string[];
      checksum?: string;
    }) => {
      const res = await api.post("/realestate/documents/init-upload", data);
      return res.data as {
        ok: boolean;
        uploadUrl: string;
        storagePath: string;
        uploadSessionId: string;
      };
    },
    commit: async (data: {
      uploadSessionId: string;
      storagePath: string;
      linkedEntityType: string;
      linkedEntityId: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      title: string;
      docType: string;
      validUntil?: string;
      tags?: string[];
      checksum?: string;
    }) => {
      const res = await api.post("/realestate/documents/commit", data);
      return res.data as { ok: boolean; document: RealEstateDocument };
    },
    list: async (filters: {
      linkedEntityId?: string;
      linkedEntityType?: string;
      docType?: string;
      status?: string;
    }) => {
      const params = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
      const res = await api.get<{ ok: boolean; documents: RealEstateDocument[] }>(
        `/realestate/documents${params.toString() ? `?${params.toString()}` : ""}`
      );
      return res.data.documents;
    },
  },
  receivables: {
    generateBatch: async (period: string) => {
      const res = await api.post("/realestate/receivables/generate-batch", { period });
      return res.data as { ok: boolean; created: number };
    },
    list: async (filters: {
      period?: string;
      status?: string;
      ownerId?: string;
      unitId?: string;
      contractId?: string;
    }) => {
      const params = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
      const res = await api.get<{ ok: boolean; receivables: Receivable[] }>(
        `/realestate/receivables${params.toString() ? `?${params.toString()}` : ""}`
      );
      return res.data.receivables;
    },
    recordPayment: async (id: string, amount: number, date: string) => {
      const res = await api.post(`/realestate/receivables/${id}/payment`, { amount, date });
      return res.data.receivable as Receivable;
    },
  },
  analytics: {
    getAging: async () => {
      const res = await api.get<{ ok: boolean; aging: AgingSnapshot }>(`/realestate/analytics/aging`);
      return res.data.aging;
    },
  },
  financial: {
    getReceivables: async () => {
      return [];
    },
    generateStatement: async (ownerId: string, period: string) => {
      const res = await api.post("/realestate/statements/generate", { ownerId, period });
      return res.data as { ok: boolean; statement: OwnerStatement };
    },
    listStatements: async (ownerId: string) => {
      const res = await api.get(`/realestate/statements?ownerId=${ownerId}`);
      return res.data.statements as OwnerStatement[];
    },
  },
};

// Mantendo compatibilidade com o formato legado se necessário,
// mas agora buscando via API se possível.
// O dashboard atual usa statements, vamos focar neles.
