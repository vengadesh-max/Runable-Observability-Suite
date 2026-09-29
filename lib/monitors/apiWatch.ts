/**
 * @file lib/monitors/apiWatch.ts
 * @description Internal & third-party API availability, latency, and error rate monitoring module.
 */

import { CheckResult, MonitoredServiceConfig, Status } from '../types';
import { getLatestStatusPerService } from '../db';

/**
 * Parses configured services from MONITORED_SERVICES. No endpoints are monitored
 * until the configuration owner explicitly provides them.
 */
export function getMonitoredServicesConfig(): MonitoredServiceConfig[] {
  const envVar = process.env.MONITORED_SERVICES;
  if (!envVar) return [];
  try {
    const parsed = JSON.parse(envVar);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((service): MonitoredServiceConfig[] => {
      if (!service || typeof service.name !== 'string' || typeof service.url !== 'string') return [];
      try {
        const url = new URL(service.url);
        if (!['http:', 'https:'].includes(url.protocol) || !service.name.trim()) return [];
        return [{
          name: service.name.trim(),
          url: url.toString(),
          expectedStatus: Number.isInteger(service.expectedStatus) ? service.expectedStatus : 200,
          timeoutMs: Number.isInteger(service.timeoutMs) ? Math.min(Math.max(service.timeoutMs, 1000), 30_000) : 5000,
        }];
      } catch {
        return [];
      }
    });
  } catch (err) {
    console.warn('[ObsSuite apiWatch] Invalid MONITORED_SERVICES JSON string:', err);
    return [];
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
  if (services.length === 0) return [];
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
        headers: { 'User-Agent': 'ObsSuite-Monitoring-Agent/1.0' },
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
