import React, { createContext, useContext, useState, useMemo, useCallback } from "react";

const DEFAULT_TENANT_ID =
  import.meta.env.VITE_DEFAULT_TENANT_ID || "demo-tenant-001";

type TenantContextValue = {
  tenantId: string;
  setTenantId: (id: string) => void;
};

const TenantContext = createContext<TenantContextValue>({
  tenantId: DEFAULT_TENANT_ID,
  setTenantId: () => {},
});

let currentTenantId = DEFAULT_TENANT_ID;

export const getCurrentTenantId = () => currentTenantId;

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string>(DEFAULT_TENANT_ID);

  const setTenantId = useCallback((id: string) => {
    currentTenantId = id || DEFAULT_TENANT_ID;
    setTenantIdState(currentTenantId);
  }, []);

  const value = useMemo(() => ({ tenantId, setTenantId }), [tenantId, setTenantId]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
