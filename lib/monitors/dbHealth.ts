/**
 * @file lib/monitors/dbHealth.ts
 * @description Database health monitor checking connection latency and read/write probe capabilities.
 */

import { CheckResult } from '../types';
import { probeDatabaseHealth } from '../db';

/**
 * Runs database connectivity, round-trip latency, and write/read probe checks (§2.3).
 * Thresholds:
 * - Latency > 1000ms: critical
 * - Latency > 300ms: degraded
 * - Thrown error: critical
 * @returns Array containing single CheckResult for primary-db
 */
export async function checkDbHealth(): Promise<CheckResult[]> {
  const serviceName = 'primary-db';
  try {
    const { latencyMs, error } = await probeDatabaseHealth();

    if (error) {
      return [
        {
          checkType: 'db_health',
          serviceName,
          status: 'critical',
          metricValue: null,
          metricUnit: 'ms',
          message: `Database probe failed: ${error}`,
        },
      ];
    }

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (latencyMs > 1000) {
      status = 'critical';
    } else if (latencyMs > 300) {
      status = 'degraded';
    }

    const msg =
      status === 'healthy'
        ? `Database online & probe passed (Latency: ${latencyMs}ms)`
        : `Database response high latency (${latencyMs}ms)`;

    return [
      {
        checkType: 'db_health',
        serviceName,
        status,
        metricValue: latencyMs,
        metricUnit: 'ms',
        message: msg,
      },
    ];
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return [
      {
        checkType: 'db_health',
        serviceName,
        status: 'critical',
        metricValue: null,
        metricUnit: 'ms',
        message: `Database monitor exception: ${errorMsg}`,
      },
    ];
  }
}
