/**
 * @file app/api/test-alert/route.ts
 * @description API endpoint to simulate critical or degraded alerts for testing Slack notifications & UI feeds.
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveCheckResults } from '@/lib/db';
import { evaluateAndAlert, sendSlackAlert } from '@/lib/alertEngine';
import { CheckResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/test-alert
 * Body: { serviceName?: string, status?: 'degraded' | 'critical', sendSlack?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const serviceName = body.serviceName || 'orders-api';
    const status = body.status === 'degraded' ? 'degraded' : 'critical';

    const testResult: CheckResult = {
      checkType: 'api_watch',
      serviceName,
      status,
      metricValue: status === 'critical' ? 5000 : 1850,
      metricUnit: 'ms',
      message: `[TEST SIMULATION] ${serviceName} response latency ${status === 'critical' ? 'EXCEEDED TIMEOUT (5000ms)' : 'HIGH LATENCY (1850ms)'}`,
    };

    // Save test result to ledger
    await saveCheckResults([testResult]);

    // Force alert evaluation or direct Slack delivery
    let slackSent = false;
    if (body.sendSlack !== false) {
      slackSent = await sendSlackAlert(testResult);
    } else {
      await evaluateAndAlert([testResult]);
    }

    return NextResponse.json({
      ok: true,
      simulatedResult: testResult,
      slackNotificationSent: slackSent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
