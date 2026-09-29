/**
 * @file app/api/cron/route.ts
 * @description Vercel Cron trigger API endpoint. Orchestrates parallel monitoring checks, persists results, and evaluates alerts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/monitors/dbHealth';
import { checkApiWatch } from '@/lib/monitors/apiWatch';
import { checkLlmCredits } from '@/lib/monitors/llmCredits';
import { saveCheckResults, tryAdvisoryLock, unlockAdvisoryLock } from '@/lib/db';
import { evaluateAndAlert } from '@/lib/alertEngine';
import { CheckResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron
 * Orchestrates monitor checks on schedule (§2.5).
 */
export async function GET(request: NextRequest) {
  // 1. Bearer Token Authorization Check (§5.3)
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const isManualForce = process.env.NODE_ENV !== 'production' && request.nextUrl.searchParams.get('force') === 'true';

  if (!isManualForce && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET token' }, { status: 401 });
  }

  // 2. Concurrency Guard using Advisory Lock (§1.4)
  const acquiredLock = await tryAdvisoryLock(727272);
  if (!acquiredLock) {
    return NextResponse.json(
      { skipped: true, reason: 'Already running in another concurrent invocation' },
      { status: 200 }
    );
  }

  try {
    // 3. Parallel Execution via Promise.allSettled (§1.3 Failure Isolation)
    const settled = await Promise.allSettled([
      checkLlmCredits(),
      checkDbHealth(),
      checkApiWatch(),
    ]);

    const results: CheckResult[] = [];

    for (const item of settled) {
      if (item.status === 'fulfilled') {
        results.push(...item.value);
      } else {
        // Monitor failure is recorded as critical signal
        results.push({
          checkType: 'api_watch',
          serviceName: 'obs-monitor-runner',
          status: 'critical',
          metricValue: null,
          metricUnit: null,
          message: `Monitor module failed with uncaught exception: ${item.reason instanceof Error ? item.reason.message : String(item.reason)}`,
        });
      }
    }

    // 4. Save to Ledger Store (§1.2)
    const savedRows = await saveCheckResults(results);

    // 5. Evaluate Alert Engine (§2.4)
    const { alertedCount, recoveryCount } = await evaluateAndAlert(results);

    return NextResponse.json({
      ok: true,
      checked: savedRows.length,
      alerted: alertedCount,
      recoveries: recoveryCount,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: errorMsg, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  } finally {
    // 6. Release Advisory Lock (§1.4)
    await unlockAdvisoryLock(727272);
  }
}
