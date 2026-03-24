import * as tenantRepo from "../repositories/tenant.repository";
import { buildTenantSlug } from "../utils/slug";

export async function createTenant(name: string) {
  return tenantRepo.createTenant({
    name,
    slug: buildTenantSlug(name)
  });
}

export async function getTenants() {
  return tenantRepo.getTenants();
}
