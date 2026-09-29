/**
 * @file app/api/status/route.ts
 * @description Single API endpoint serving current operational status, sparklines, alert feed, and LLM spend.
 * READ-ONLY: Live monitor checks run exclusively via /api/cron. This route only reads from the ledger.
 */

import { NextResponse } from 'next/server';
import { getAlertFeed, getLatestStatusPerService, getMonthToDateLlmSpend, getSparklineHistory } from '@/lib/db';
import { getMonthlyBudgetUsd } from '@/lib/monitors/llmCredits';
import { getMonitoredServicesConfig } from '@/lib/monitors/apiWatch';
import { createEmptyStatusPayload } from '@/lib/statusPayload';
import { ServiceStatus, Status, StatusPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Wraps a promise with a timeout — resolves to fallback value if it exceeds limitMs */
async function withTimeout<T>(promise: Promise<T>, limitMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), limitMs)),
  ]);
}

/**
 * GET /api/status
 * Consolidated payload endpoint for Observability Suite dashboard.
 * Always returns HTTP 200 with valid JSON — never hangs or throws to client.
 */
export async function GET() {
  try {
    const now = new Date();
    const budgetUsd = getMonthlyBudgetUsd();
    const monitoredServices = getMonitoredServicesConfig();
    const configuration = {
      databaseConfigured: Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL),
      monitoredServiceCount: monitoredServices.length,
      slackConfigured: Boolean(process.env.SLACK_WEBHOOK_URL),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      budgetConfigured: budgetUsd > 0,
      ingestionKeyConfigured: Boolean(process.env.INGEST_API_KEY),
      manualChecksAvailable: process.env.NODE_ENV !== 'production',
    };
    const emptyPayload = createEmptyStatusPayload(
      monitoredServices,
      configuration.databaseConfigured,
      budgetUsd,
      now.toISOString(),
      configuration,
    );

    // All DB reads race against a 2.5s timeout — UI never blocks on slow/unavailable DB
    const [latestRows, sparklineData, alertRows, llmMetrics] = await Promise.all([
      withTimeout(getLatestStatusPerService(), 2500, []),
      withTimeout(getSparklineHistory(60), 2500, []),
      withTimeout(getAlertFeed(20), 2500, []),
      withTimeout(getMonthToDateLlmSpend(), 2500, { totalSpendUsd: 0, providerBreakdown: {} }),
    ]);

    const totalSpend = llmMetrics.totalSpendUsd || 0;
    const spendPct = budgetUsd > 0 ? Math.min(100, Math.round((totalSpend / budgetUsd) * 100)) : 0;

    const dayOfMonth = Math.max(1, now.getDate());
    const hoursPassed = Math.max(1, (dayOfMonth - 1) * 24 + now.getHours());
    const burnRatePerHour = totalSpend / hoursPassed;

    const latestServices = latestRows.map((row) => ({
            serviceName: row.serviceName,
            checkType: row.checkType,
            status: row.status,
            metricValue: row.metricValue,
            metricUnit: row.metricUnit,
            message: row.message,
            lastChecked: row.checkedAt,
            alerted: row.alerted,
          }));
    const latestByName = new Map(latestServices.map((service) => [service.serviceName, service]));
    const configuredServices = emptyPayload.services.map((service) => latestByName.get(service.serviceName) || service);
    const unconfiguredServices = latestServices.filter((service) => !emptyPayload.services.some((empty) => empty.serviceName === service.serviceName));
    const services: ServiceStatus[] = [...configuredServices, ...unconfiguredServices];

    let healthyCount = 0;
    let degradedCount = 0;
    let criticalCount = 0;
    for (const s of services) {
      if (s.status === 'critical') criticalCount++;
      else if (s.status === 'degraded') degradedCount++;
      else if (s.status === 'healthy') healthyCount++;
    }

    let overallStatus: Status = services.some((service) => service.status !== 'unknown') ? 'healthy' : 'unknown';
    if (criticalCount > 0) overallStatus = 'critical';
    else if (degradedCount > 0) overallStatus = 'degraded';

    const payload: StatusPayload = {
      services,
      sparkline:
        sparklineData.length > 0 ? sparklineData : emptyPayload.sparkline,
      alerts: alertRows.map((a) => ({
        id: a.id,
        serviceName: a.serviceName,
        checkType: a.checkType,
        status: a.status,
        metricValue: a.metricValue,
        metricUnit: a.metricUnit,
        message: a.message,
        checkedAt: a.checkedAt,
      })),
      llmSpend: {
        totalMonthToDateUsd: Math.round(totalSpend * 100) / 100,
        budgetUsd,
        spendPercentage: spendPct,
        burnRatePerHourUsd: Math.round(burnRatePerHour * 100) / 100,
        providerBreakdown: llmMetrics.providerBreakdown,
      },
      summary: {
        totalServices: services.length,
        healthyCount,
        degradedCount,
        criticalCount,
        overallStatus,
        lastUpdated: new Date().toISOString(),
      },
      configuration,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[ObsSuite Status API] Fatal status route error:', errorMsg);

    // Nuclear fallback — always returns valid JSON with zero-state
    const budgetUsd = getMonthlyBudgetUsd();
    const monitoredServices = getMonitoredServicesConfig();
    return NextResponse.json(createEmptyStatusPayload(
      monitoredServices,
      Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL),
      budgetUsd,
      '',
      {
        slackConfigured: Boolean(process.env.SLACK_WEBHOOK_URL),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        ingestionKeyConfigured: Boolean(process.env.INGEST_API_KEY),
        manualChecksAvailable: process.env.NODE_ENV !== 'production',
      },
    ));
  }
}
