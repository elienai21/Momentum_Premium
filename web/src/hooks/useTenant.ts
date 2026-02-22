import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export interface TenantData {
  name: string;
  logoUrl?: string;
}

export function useTenant(tenantId: string | null) {
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [role, setRole] = useState<string>("viewer");

  useEffect(() => {
    const storedRole = localStorage.getItem("momentum:role");
    if (storedRole) {
      setRole(storedRole);
    }
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      return;
    }
    async function fetchTenant() {
      try {
        const docRef = doc(db, "tenants", tenantId!);
        const snap = await getDoc(docRef);
        if (snap.exists()) setTenant(snap.data() as TenantData);
      } catch (err) {
        console.error("Erro ao carregar tenant:", err);
      }
    }
    fetchTenant();
  }, [tenantId]);

  return { tenant, role };
}
