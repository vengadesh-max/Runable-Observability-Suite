/**
 * @file app/api/status/route.ts
 * @description Single API endpoint serving current operational status, sparklines, alert feed, and LLM spend for dashboard.
 */

import { NextResponse } from 'next/server';
import { getAlertFeed, getLatestStatusPerService, getMonthToDateLlmSpend, getSparklineHistory } from '@/lib/db';
import { getMonthlyBudgetUsd } from '@/lib/monitors/llmCredits';
import { CheckResult, ServiceStatus, Status, StatusPayload } from '@/lib/types';
import { checkDbHealth } from '@/lib/monitors/dbHealth';
import { checkApiWatch } from '@/lib/monitors/apiWatch';
import { checkLlmCredits } from '@/lib/monitors/llmCredits';
import { saveCheckResults } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Ensures initial check results are populated if ledger is empty.
 */
async function ensureInitialData(): Promise<void> {
  const existing = await getLatestStatusPerService();
  if (existing.length === 0) {
    const results: CheckResult[] = [];
    const [llm, db, api] = await Promise.all([
      checkLlmCredits(),
      checkDbHealth(),
      checkApiWatch(),
    ]);
    results.push(...llm, ...db, ...api);
    await saveCheckResults(results);
  }
}

/**
 * GET /api/status
 * Consolidated payload endpoint for Pulse dashboard (§2.5).
 */
export async function GET() {
  try {
    await ensureInitialData();

    const [latestRows, sparklineData, alertRows, llmMetrics] = await Promise.all([
      getLatestStatusPerService(),
      getSparklineHistory(60),
      getAlertFeed(20),
      getMonthToDateLlmSpend(),
    ]);

    const budgetUsd = getMonthlyBudgetUsd();
    const spendPct = Math.min(100, Math.round((llmMetrics.totalSpendUsd / budgetUsd) * 100));

    // Calculate burn rate per hour
    const now = new Date();
    const dayOfMonth = Math.max(1, now.getDate());
    const hoursPassed = (dayOfMonth - 1) * 24 + now.getHours() + 1;
    const burnRatePerHour = llmMetrics.totalSpendUsd / hoursPassed;

    // Transform service status rows
    const services: ServiceStatus[] = latestRows.map((row) => ({
      serviceName: row.serviceName,
      checkType: row.checkType,
      status: row.status,
      metricValue: row.metricValue,
      metricUnit: row.metricUnit,
      message: row.message,
      lastChecked: row.checkedAt,
      alerted: row.alerted,
    }));

    // Aggregate overall status
    let healthyCount = 0;
    let degradedCount = 0;
    let criticalCount = 0;

    for (const s of services) {
      if (s.status === 'critical') criticalCount++;
      else if (s.status === 'degraded') degradedCount++;
      else healthyCount++;
    }

    let overallStatus: Status = 'healthy';
    if (criticalCount > 0) overallStatus = 'critical';
    else if (degradedCount > 0) overallStatus = 'degraded';

    const payload: StatusPayload = {
      services,
      sparkline: sparklineData,
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
        totalMonthToDateUsd: Math.round(llmMetrics.totalSpendUsd * 100) / 100,
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
    };

    return NextResponse.json(payload);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
