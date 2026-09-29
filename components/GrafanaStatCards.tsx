'use client';

/**
 * @file components/GrafanaStatCards.tsx
 * @description Editorial Neoclassical Big Stat Summary Cards Strip.
 */

import React from 'react';
import { ServiceStatus, Status } from '@/lib/types';
import { Activity, Server, Database, Cpu, Flame } from 'lucide-react';

interface GrafanaStatCardsProps {
  services: ServiceStatus[];
  totalSpendUsd: number;
  budgetUsd: number;
  spendPercentage: number;
  burnRatePerHourUsd: number;
  overallStatus: Status;
}

export const GrafanaStatCards: React.FC<GrafanaStatCardsProps> = ({
  services = [],
  totalSpendUsd = 0,
  budgetUsd = 0,
  spendPercentage = 0,
  burnRatePerHourUsd = 0,
  overallStatus = 'healthy',
}) => {
  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const degradedCount = services.filter((s) => s.status === 'degraded').length;
  const criticalCount = services.filter((s) => s.status === 'critical').length;

  const dbService = services.find((s) => s.checkType === 'db_health');
  const avgDbLatency = dbService?.metricValue;

  const apiServices = services.filter((s) => s.checkType === 'api_watch');
  const maxApiLatency = apiServices.length > 0 && apiServices.every((service) => service.metricValue !== null)
    ? apiServices.reduce((max, service) => Math.max(max, service.metricValue || 0), 0)
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Stat 1: Overall System Status */}
      <div className="editorial-card p-4 flex flex-col justify-between border-l-4 border-l-emerald-600 bg-white">
        <div className="flex items-center justify-between text-xs font-mono-data text-editorial-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">System State</span>
          <Activity className="w-4 h-4 text-emerald-700" />
        </div>
        <div>
          <div className="text-2xl font-bold font-editorial-serif text-editorial-text uppercase tracking-wide">
            {overallStatus}
          </div>
          <p className="text-xs text-editorial-muted font-mono-data mt-1">
            {healthyCount} Healthy / {degradedCount + criticalCount} Issues
          </p>
        </div>
      </div>

      {/* Stat 2: Active Monitored Services */}
      <div className="editorial-card p-4 flex flex-col justify-between border-l-4 border-l-burgundy bg-white">
        <div className="flex items-center justify-between text-xs font-mono-data text-editorial-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">Monitored Services</span>
          <Server className="w-4 h-4 text-burgundy" />
        </div>
        <div>
          <div className="text-2xl font-bold font-editorial-serif text-editorial-text">
            {services.length} <span className="text-xs font-normal text-editorial-muted font-sans">Active</span>
          </div>
          <p className="text-xs text-editorial-muted font-mono-data mt-1">Configured integrations</p>
        </div>
      </div>

      {/* Stat 3: MTD LLM Credit Spend */}
      <div className="editorial-card p-4 flex flex-col justify-between border-l-4 border-l-burntOrange bg-white">
        <div className="flex items-center justify-between text-xs font-mono-data text-editorial-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">LLM MTD Spend</span>
          <Cpu className="w-4 h-4 text-burntOrange" />
        </div>
        <div>
          <div className="text-2xl font-bold font-editorial-serif text-editorial-text">
            {totalSpendUsd > 0 || services.length > 0 ? `$${totalSpendUsd.toFixed(2)}` : 'No data'}
          </div>
          <p className="text-xs font-mono-data mt-1 text-editorial-muted flex items-center justify-between">
            <span>{budgetUsd > 0 ? `Quota: $${budgetUsd}` : 'Budget not configured'}</span>
            <span className="font-bold text-burntOrange">{spendPercentage}%</span>
          </p>
        </div>
      </div>

      {/* Stat 4: Hourly Token Burn Rate */}
      <div className="editorial-card p-4 flex flex-col justify-between border-l-4 border-l-amber-600 bg-white">
        <div className="flex items-center justify-between text-xs font-mono-data text-editorial-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">Hourly Burn Rate</span>
          <Flame className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="text-2xl font-bold font-editorial-serif text-editorial-text">
            {burnRatePerHourUsd > 0 ? `$${burnRatePerHourUsd.toFixed(2)}` : 'No data'}
          </div>
          <p className="text-xs text-editorial-muted font-mono-data mt-1">
            Est. Multi-Agent Token Cost
          </p>
        </div>
      </div>

      {/* Stat 5: Avg DB Latency */}
      <div className="editorial-card p-4 flex flex-col justify-between border-l-4 border-l-stone-600 bg-white">
        <div className="flex items-center justify-between text-xs font-mono-data text-editorial-muted mb-2">
          <span className="font-semibold uppercase tracking-wider">Primary DB Latency</span>
          <Database className="w-4 h-4 text-stone-700" />
        </div>
        <div>
          <div className="text-2xl font-bold font-editorial-serif text-editorial-text">
            {avgDbLatency === null || avgDbLatency === undefined ? 'No data' : `${avgDbLatency} ms`}
          </div>
          <p className="text-xs text-editorial-muted font-mono-data mt-1">
            {maxApiLatency === null ? 'No API data' : `Max API Ping: ${maxApiLatency}ms`}
          </p>
        </div>
      </div>
    </div>
  );
};
