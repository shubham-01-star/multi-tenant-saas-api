import * as tenantRepo from "../repositories/tenant.repository";

export async function createTenant(name: string) {
  return tenantRepo.createTenant(name);
}

export async function getTenants() {
  return tenantRepo.getTenants();
}