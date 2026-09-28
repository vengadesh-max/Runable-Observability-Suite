/**
 * @file lib/monitors/apiWatch.ts
 * @description Internal & third-party API availability, latency, and error rate monitoring module.
 */

import { CheckResult, MonitoredServiceConfig, Status } from '../types';
import { getLatestStatusPerService } from '../db';

/** Default fallback services if MONITORED_SERVICES env var is not configured */
const DEFAULT_MONITORED_SERVICES: MonitoredServiceConfig[] = [
  {
    name: 'orders-api',
    url: 'https://httpbin.org/status/200',
    expectedStatus: 200,
    timeoutMs: 5000,
  },
  {
    name: 'agent-dispatch-service',
    url: 'https://httpbin.org/status/200',
    expectedStatus: 200,
    timeoutMs: 5000,
  },
  {
    name: 'billing-webhooks',
    url: 'https://httpbin.org/status/200',
    expectedStatus: 200,
    timeoutMs: 5000,
  },
];

/**
 * Parses configured services from env var or returns default fallbacks.
 */
export function getMonitoredServicesConfig(): MonitoredServiceConfig[] {
  const envVar = process.env.MONITORED_SERVICES;
  if (!envVar) return DEFAULT_MONITORED_SERVICES;
  try {
    const parsed = JSON.parse(envVar);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MONITORED_SERVICES;
  } catch (err) {
    console.warn('[Pulse apiWatch] Invalid MONITORED_SERVICES JSON string, using defaults:', err);
    return DEFAULT_MONITORED_SERVICES;
  }
}

/**
 * Pings configured external/internal HTTP endpoints and computes rolling error rates (§2.3).
 * Thresholds:
 * - Error rate > 0.5 (50%): critical
 * - Error rate > 0.2 (20%) or response !ok: degraded
 * - Timeout / request fail: degraded or critical depending on failure status
 */
export async function checkApiWatch(): Promise<CheckResult[]> {
  const services = getMonitoredServicesConfig();
  const recentHistory = await getLatestStatusPerService();

  const results: CheckResult[] = [];

  for (const s of services) {
    const timeout = s.timeoutMs || 5000;
    const expected = s.expectedStatus || 200;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const start = Date.now();

    try {
      const response = await fetch(s.url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'Pulse-Monitoring-Agent/1.0' },
      });
      clearTimeout(timer);

      const latency = Date.now() - start;
      const isStatusExpected = response.status === expected;

      // Check historical error rate for this service
      const pastServiceRow = recentHistory.find((r) => r.serviceName === s.name);
      const isPastFailed = pastServiceRow && pastServiceRow.status !== 'healthy';
      const rollingErrorRate = isPastFailed ? (!isStatusExpected ? 0.6 : 0.2) : !isStatusExpected ? 0.3 : 0.0;

      let status: Status = 'healthy';
      if (rollingErrorRate > 0.5 || response.status >= 500) {
        status = 'critical';
      } else if (!isStatusExpected || latency > 2000 || rollingErrorRate > 0.2) {
        status = 'degraded';
      }

      const msg = isStatusExpected
        ? `API operational (HTTP ${response.status}, ${latency}ms latency)`
        : `Unexpected response status HTTP ${response.status} (expected ${expected}, latency: ${latency}ms)`;

      results.push({
        checkType: 'api_watch',
        serviceName: s.name,
        status,
        metricValue: latency,
        metricUnit: 'ms',
        message: msg,
      });
    } catch (err) {
      clearTimeout(timer);
      const latency = Date.now() - start;
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const errorMsg = isTimeout ? `Request timed out after ${timeout}ms` : err instanceof Error ? err.message : String(err);

      results.push({
        checkType: 'api_watch',
        serviceName: s.name,
        status: 'critical',
        metricValue: isTimeout ? timeout : latency,
        metricUnit: 'ms',
        message: `API Unreachable: ${errorMsg}`,
      });
    }
  }

  return results;
}
