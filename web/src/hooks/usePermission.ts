import { useTenant as useTenantContext } from "../context/TenantContext";
import { useTenant as useTenantData } from "./useTenant";

export function usePermission() {
  const { tenantId } = useTenantContext();
  const { role } = useTenantData(tenantId || null);

  const canEdit = ["admin", "owner", "finance", "editor"].includes(role || "");
  const canManageFinance = ["admin", "owner", "finance"].includes(role || "");

  return { canEdit, canManageFinance, role: role || "viewer" };
}
