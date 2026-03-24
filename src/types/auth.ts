export type TenantRole = "OWNER" | "MEMBER";

export interface AuthContext {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  userId: string;
  email: string;
  role: TenantRole;
  apiKeyId: string;
  apiKeyName: string;
  apiKeyPrefix: string;
  gracePeriodActive: boolean;
}
