import React, { createContext, useContext, useState, useMemo, useCallback } from "react";

type TenantContextValue = {
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
};

const TenantContext = createContext<TenantContextValue>({
  tenantId: null,
  setTenantId: () => {},
});

let currentTenantId: string | null = null;

export const getCurrentTenantId = () => currentTenantId;

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(null);

  const setTenantId = useCallback((id: string | null) => {
    currentTenantId = id || null;
    setTenantIdState(currentTenantId);
  }, []);

  const value = useMemo(() => ({ tenantId, setTenantId }), [tenantId, setTenantId]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  return useContext(TenantContext);
}
