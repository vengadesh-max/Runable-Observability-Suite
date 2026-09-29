/**
 * @file lib/types.ts
 * @description Core TypeScript type definitions and domain interfaces for Observability Suite Monitoring Pipeline.
 */

/** Category of system check being performed */
export type CheckType = 'llm_credit' | 'db_health' | 'api_watch';

/** Operational status level of a service or check */
export type Status = 'unknown' | 'healthy' | 'degraded' | 'critical';

/** Unit of measurement for metric values */
export type MetricUnit = 'usd' | 'ms' | 'pct' | null;

/**
 * Normalized result returned by individual monitor checks.
 */
export interface CheckResult {
  /** Type category of the check */
  checkType: CheckType;
  /** Unique name identifier of the monitored service */
  serviceName: string;
  /** Current evaluated status */
  status: Status;
  /** Numeric metric value (spend $, latency ms, error rate %, etc.) */
  metricValue: number | null;
  /** Unit for the metric value */
  metricUnit: MetricUnit;
  /** Human-readable status message for Slack & UI */
  message: string;
}

/**
 * Ledger record row stored in PostgreSQL monitoring_ledger table.
 */
export interface LedgerRow extends CheckResult {
  /** Database auto-increment ID */
  id: number;
  /** Flag indicating whether a Slack alert was triggered for this result */
  alerted: boolean;
  /** Timestamp when check was recorded */
  checkedAt: string;
}

/**
 * Configuration schema for third-party or internal APIs monitored by apiWatch.
 */
export interface MonitoredServiceConfig {
  /** Human-readable name of the service */
  name: string;
  /** HTTP URL to ping for health check */
  url: string;
  /** Expected HTTP response status code (default: 200) */
  expectedStatus?: number;
  /** HTTP request timeout in milliseconds (default: 5000) */
  timeoutMs?: number;
}

/**
 * Latest status summary for a single service shown on the dashboard.
 */
export interface ServiceStatus {
  serviceName: string;
  checkType: CheckType;
  status: Status;
  metricValue: number | null;
  metricUnit: MetricUnit;
  message: string;
  lastChecked: string;
  alerted: boolean;
}

/**
 * Sparkline graph data point for visual timeline.
 */
export interface SparklinePoint {
  checkedAt: string;
  severity: number; // 0 = healthy, 1 = degraded, 2 = critical
  status: Status;
}

/**
 * Alert feed item for incident history panel.
 */
export interface AlertFeedItem {
  id: number;
  serviceName: string;
  checkType: CheckType;
  status: Status;
  metricValue: number | null;
  metricUnit: MetricUnit;
  message: string;
  checkedAt: string;
  isRecovery?: boolean;
}

/**
 * LLM usage event record logged by multi-agent SaaS tasks.
 */
export interface LlmUsageEvent {
  id?: number;
  provider: string; // e.g. 'openai', 'anthropic', 'google-gemini'
  taskId?: string;  // correlate to agent task execution ID
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt?: string;
}

/**
 * Combined JSON payload returned by GET /api/status endpoint for dashboard rendering.
 */
export interface StatusPayload {
  services: ServiceStatus[];
  sparkline: SparklinePoint[];
  alerts: AlertFeedItem[];
  llmSpend: {
    totalMonthToDateUsd: number;
    budgetUsd: number;
    spendPercentage: number;
    burnRatePerHourUsd: number;
    providerBreakdown: Record<string, number>;
  };
  summary: {
    totalServices: number;
    healthyCount: number;
    degradedCount: number;
    criticalCount: number;
    overallStatus: Status;
    lastUpdated: string;
  };
  configuration: {
    databaseConfigured: boolean;
    monitoredServiceCount: number;
    slackConfigured: boolean;
    geminiConfigured: boolean;
    budgetConfigured: boolean;
    ingestionKeyConfigured: boolean;
    manualChecksAvailable: boolean;
  };
}
