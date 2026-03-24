function normalizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildTenantSlug(name: string) {
  const base = normalizeSegment(name) || "tenant";
  const suffix = Date.now().toString(36);

  return base + "-" + suffix;
}
