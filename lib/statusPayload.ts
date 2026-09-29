import { MonitoredServiceConfig, ServiceStatus, StatusPayload } from './types';

/** A renderable dashboard payload for an empty or temporarily unavailable ledger. */
export function createEmptyStatusPayload(
  monitoredServices: MonitoredServiceConfig[] = [],
  databaseConfigured = false,
  budgetUsd = 0,
  timestamp = '',
  configurationOverrides: Partial<StatusPayload['configuration']> = {},
): StatusPayload {
  const services: ServiceStatus[] = [
    ...(databaseConfigured ? [{
      serviceName: 'primary-db',
      checkType: 'db_health' as const,
      status: 'unknown' as const,
      metricValue: null,
      metricUnit: 'ms' as const,
      message: 'Awaiting first database check',
      lastChecked: timestamp,
      alerted: false,
    }] : []),
    ...monitoredServices.map((service) => ({
      serviceName: service.name,
      checkType: 'api_watch' as const,
      status: 'unknown' as const,
      metricValue: null,
      metricUnit: 'ms' as const,
      message: 'Awaiting first endpoint check',
      lastChecked: timestamp,
      alerted: false,
    })),
  ];

  return {
    services,
    sparkline: [],
    alerts: [],
    llmSpend: {
      totalMonthToDateUsd: 0,
      budgetUsd,
      spendPercentage: 0,
      burnRatePerHourUsd: 0,
      providerBreakdown: {},
    },
    summary: {
      totalServices: services.length,
      healthyCount: 0,
      degradedCount: 0,
      criticalCount: 0,
      overallStatus: 'unknown',
      lastUpdated: timestamp,
    },
    configuration: {
      databaseConfigured,
      monitoredServiceCount: monitoredServices.length,
      slackConfigured: false,
      geminiConfigured: false,
      budgetConfigured: budgetUsd > 0,
      ingestionKeyConfigured: false,
      manualChecksAvailable: process.env.NODE_ENV !== 'production',
      ...configurationOverrides,
    },
  };
}
