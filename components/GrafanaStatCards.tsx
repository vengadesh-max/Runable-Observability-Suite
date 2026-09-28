'use client';

/**
 * @file components/GrafanaStatCards.tsx
 * @description Grafana Big Stat Summary Cards Strip component (Warm & Light theme).
 */

import React from 'react';
import { ServiceStatus, Status } from '@/lib/types';
import { Activity, Server, Database, Cpu, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface GrafanaStatCardsProps {
  services: ServiceStatus[];
  totalSpendUsd: number;
  budgetUsd: number;
  spendPercentage: number;
  burnRatePerHourUsd: number;
  overallStatus: Status;
}

export const GrafanaStatCards: React.FC<GrafanaStatCardsProps> = ({
  services,
  totalSpendUsd,
  budgetUsd,
  spendPercentage,
  burnRatePerHourUsd,
  overallStatus,
}) => {
  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const criticalCount = services.filter((s) => s.status === 'critical').length;

  const dbService = services.find((s) => s.checkType === 'db_health');
  const avgDbLatency = dbService?.metricValue ?? 14;

  const apiServices = services.filter((s) => s.checkType === 'api_watch');
  const maxApiLatency = apiServices.reduce((max, s) => Math.max(max, s.metricValue || 0), 0) || 110;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Stat 1: Overall System Status */}
      <div className="grafana-panel p-4 flex flex-col justify-between border-l-4 border-l-grafana-green">
        <div className="flex items-center justify-between text-xs font-mono-data text-grafana-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">Overall System State</span>
          <Activity className="w-4 h-4 text-grafana-green" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono-data text-grafana-text uppercase">
            {overallStatus}
          </div>
          <p className="text-xs text-grafana-muted font-mono-data mt-1">
            {healthyCount} Healthy / {degradedCount + criticalCount} Issues
          </p>
        </div>
      </div>

      {/* Stat 2: Active Runable Monitored Services */}
      <div className="grafana-panel p-4 flex flex-col justify-between border-l-4 border-l-grafana-blue">
        <div className="flex items-center justify-between text-xs font-mono-data text-grafana-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">Monitored Services</span>
          <Server className="w-4 h-4 text-grafana-blue" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono-data text-grafana-text">
            {services.length} <span className="text-xs font-normal text-grafana-muted">Active</span>
          </div>
          <p className="text-xs text-grafana-muted font-mono-data mt-1">
            Runable SaaS & Container Pool
          </p>
        </div>
      </div>

      {/* Stat 3: MTD LLM Credit Spend */}
      <div className="grafana-panel p-4 flex flex-col justify-between border-l-4 border-l-grafana-orange">
        <div className="flex items-center justify-between text-xs font-mono-data text-grafana-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">LLM MTD Spend</span>
          <Cpu className="w-4 h-4 text-grafana-orange" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono-data text-grafana-text">
            ${totalSpendUsd.toFixed(2)}
          </div>
          <p className="text-xs font-mono-data mt-1 text-grafana-muted flex items-center justify-between">
            <span>Quota: ${budgetUsd}</span>
            <span className="font-bold text-grafana-orange">{spendPercentage}%</span>
          </p>
        </div>
      </div>

      {/* Stat 4: Hourly Token Burn Rate */}
      <div className="grafana-panel p-4 flex flex-col justify-between border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between text-xs font-mono-data text-grafana-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">Hourly Burn Rate</span>
          <Flame className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono-data text-grafana-text">
            ${burnRatePerHourUsd.toFixed(2)} <span className="text-xs font-normal text-grafana-muted">/hr</span>
          </div>
          <p className="text-xs text-grafana-muted font-mono-data mt-1">
            Est. Multi-Agent Token Cost
          </p>
        </div>
      </div>

      {/* Stat 5: Avg DB Latency */}
      <div className="grafana-panel p-4 flex flex-col justify-between border-l-4 border-l-indigo-500">
        <div className="flex items-center justify-between text-xs font-mono-data text-grafana-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">Primary DB Latency</span>
          <Database className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono-data text-grafana-text">
            {avgDbLatency} <span className="text-xs font-normal text-grafana-muted">ms</span>
          </div>
          <p className="text-xs text-grafana-muted font-mono-data mt-1">
            Max API Ping: {maxApiLatency}ms
          </p>
        </div>
      </div>
    </div>
  );
};
