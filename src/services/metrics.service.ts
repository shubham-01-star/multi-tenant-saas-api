import { EmailDeliveryStatus } from "@prisma/client";
import prisma from "../config/db";

function getBillingPeriodStart(anchorDate: Date, now: Date) {
  const start = new Date(anchorDate);
  start.setFullYear(now.getFullYear());
  start.setMonth(now.getMonth());

  if (start.getDate() !== anchorDate.getDate()) {
    start.setDate(0);
  }

  if (start > now) {
    start.setMonth(start.getMonth() - 1);
  }

  return start;
}

export async function getTenantUsageMetrics() {
  const tenants = await prisma.tenant.findMany({
    orderBy: {
      createdAt: "asc"
    }
  });

  return Promise.all(
    tenants.map(async (tenant) => {
      const periodStart = getBillingPeriodStart(tenant.billingAnchorDate, new Date());
      const requestMetrics = await prisma.requestMetric.findMany({
        where: {
          tenantId: tenant.id,
          createdAt: {
            gte: periodStart
          }
        }
      });
      const emailDeliveries = await prisma.emailDelivery.findMany({
        where: {
          tenantId: tenant.id,
          createdAt: {
            gte: periodStart
          }
        }
      });
      const requestsByEndpoint = requestMetrics.reduce<Record<string, number>>((result, metric) => {
        result[metric.endpoint] = (result[metric.endpoint] || 0) + 1;
        return result;
      }, {});
      const breachedCount = requestMetrics.filter((metric) => metric.rateLimitBreached).length;
      const successfulEmails = emailDeliveries.filter((delivery) => delivery.status === EmailDeliveryStatus.SENT).length;
      const emailSuccessRate = emailDeliveries.length === 0 ? 100 : Math.round((successfulEmails / emailDeliveries.length) * 100);

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        billingPeriodStart: periodStart,
        totalRequests: requestMetrics.length,
        requestsByEndpoint,
        rateLimitBreachCount: breachedCount,
        emailDeliverySuccessRate: emailSuccessRate
      };
    })
  );
}
