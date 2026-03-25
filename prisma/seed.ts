import "dotenv/config";
import prisma from "../src/config/db";
import { getRedisClient } from "../src/config/redis";
import { buildTenantSlug } from "../src/utils/slug";
import { generateApiKey, hashApiKey } from "../src/lib/api-key";
import { computeAuditHash } from "../src/lib/audit-hash";

async function resetDatabase() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RequestMetric", "EmailDelivery", "AuditLog", "Project", "ApiKey", "User", "Tenant" RESTART IDENTITY CASCADE');
}

function makeAuditEntries(tenantId: string, userId: string, apiKeyId: string, count: number) {
  const entries = [] as Array<{
    tenantId: string;
    actorUserId: string;
    apiKeyId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    ipAddress: string;
    previousValue: unknown;
    newValue: unknown;
    metadata: unknown;
    previousHash: string | null;
    chainHash: string;
    createdAt: Date;
  }>;
  let previousHash: string | null = null;

  for (let index = 0; index < count; index += 1) {
    const createdAt = new Date(Date.now() - (count - index) * 60_000);
    const previousValue = index === 0 ? null : { version: index };
    const newValue = { version: index + 1, note: "seed-entry-" + (index + 1) };
    const chainHash = computeAuditHash({
      tenantId,
      actorUserId: userId,
      apiKeyId,
      action: "SEED_MUTATION",
      resourceType: "seed_resource",
      resourceId: "seed-" + (index + 1),
      ipAddress: "127.0.0.1",
      previousValue,
      newValue,
      metadata: { seed: true },
      previousHash,
      createdAt: createdAt.toISOString()
    });

    entries.push({
      tenantId,
      actorUserId: userId,
      apiKeyId,
      action: "SEED_MUTATION",
      resourceType: "seed_resource",
      resourceId: "seed-" + (index + 1),
      ipAddress: "127.0.0.1",
      previousValue,
      newValue,
      metadata: { seed: true },
      previousHash,
      chainHash,
      createdAt
    });

    previousHash = chainHash;
  }

  return entries;
}

async function seedRedisRateLimitScenario(tenantId: string, apiKeyId: string) {
  try {
    const redis = await getRedisClient();
    const now = Date.now();

    for (let index = 0; index < 15; index += 1) {
      await redis.zadd("rl:tenant:global:" + tenantId, String(now - index * 500), String(now - index * 500) + ":seed-global:" + index);
      await redis.zadd("rl:key:burst:" + apiKeyId, String(now - index * 100), String(now - index * 100) + ":seed-burst:" + index);
    }

    await redis.pexpire("rl:tenant:global:" + tenantId, 60_000);
    await redis.pexpire("rl:key:burst:" + apiKeyId, 5_000);
  } catch (error) {
    console.warn("Skipping Redis seed scenario:", error instanceof Error ? error.message : error);
  }
}

async function main() {
  await resetDatabase();

  const tenants = [] as Array<{ id: string; ownerUserId: string; ownerEmail: string; apiKeyId: string; rawKey: string }>;

  for (const name of ["Acme Corp", "Globex Labs"]) {
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: buildTenantSlug(name)
      }
    });

    const owner = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: "owner@" + tenant.slug + ".example.com",
        firstName: "Owner",
        lastName: tenant.name.split(" ")[0],
        role: "OWNER",
        status: "ACTIVE"
      }
    });

    await prisma.user.createMany({
      data: [
        {
          tenantId: tenant.id,
          email: "member1@" + tenant.slug + ".example.com",
          firstName: "Member",
          lastName: "One",
          role: "MEMBER",
          status: "ACTIVE"
        },
        {
          tenantId: tenant.id,
          email: "member2@" + tenant.slug + ".example.com",
          firstName: "Member",
          lastName: "Two",
          role: "MEMBER",
          status: "INVITED",
          invitedAt: new Date()
        }
      ]
    });

    const generatedKey = generateApiKey();
    const hashedKey = await hashApiKey(generatedKey.rawKey);
    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId: tenant.id,
        userId: owner.id,
        name: "Primary Owner Key",
        keyPrefix: generatedKey.keyPrefix,
        lastFour: generatedKey.lastFour,
        hash: hashedKey,
        active: true
      }
    });

    await prisma.project.createMany({
      data: [
        {
          tenantId: tenant.id,
          createdById: owner.id,
          name: tenant.name + " Project A",
          description: "Seeded project A"
        },
        {
          tenantId: tenant.id,
          createdById: owner.id,
          name: tenant.name + " Project B",
          description: "Seeded project B"
        }
      ]
    });

    const auditEntries = makeAuditEntries(tenant.id, owner.id, apiKey.id, 5);
    for (const entry of auditEntries) {
      await prisma.auditLog.create({
        data: entry
      });
    }

    await prisma.requestMetric.createMany({
      data: [
        {
          tenantId: tenant.id,
          apiKeyId: apiKey.id,
          method: "GET",
          endpoint: "/projects",
          statusCode: 200,
          responseTimeMs: 42,
          rateLimitBreached: false
        },
        {
          tenantId: tenant.id,
          apiKeyId: apiKey.id,
          method: "POST",
          endpoint: "/users/invite",
          statusCode: 429,
          responseTimeMs: 18,
          rateLimitBreached: true,
          breachedTier: "ENDPOINT"
        }
      ]
    });

    tenants.push({
      id: tenant.id,
      ownerUserId: owner.id,
      ownerEmail: owner.email,
      apiKeyId: apiKey.id,
      rawKey: generatedKey.rawKey
    });

    await seedRedisRateLimitScenario(tenant.id, apiKey.id);
  }

  console.log("Seed complete");
  console.table(tenants.map((tenant) => ({ tenantId: tenant.id, ownerUserId: tenant.ownerUserId, ownerEmail: tenant.ownerEmail, apiKeyId: tenant.apiKeyId, rawKey: tenant.rawKey })));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
