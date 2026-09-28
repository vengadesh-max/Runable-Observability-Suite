'use client';

/**
 * @file app/page.tsx
 * @description Main Grafana Dashboard for Multi-Agent Operations & SaaS Infrastructure.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusPayload } from '@/lib/types';
import { GrafanaNavbar } from '@/components/GrafanaNavbar';
import { GrafanaStatCards } from '@/components/GrafanaStatCards';
import { Heartbeat } from '@/components/Heartbeat';
import { SpendPanel } from '@/components/SpendPanel';
import { ServiceTable } from '@/components/ServiceTable';
import { AlertFeed } from '@/components/AlertFeed';
import { AgentTasksTable } from '@/components/AgentTasksTable';
import { RefreshCw, Terminal } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(15);
  const [timeRange, setTimeRange] = useState<string>('15m');
  const [isRefreshingManual, setIsRefreshingManual] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Fetch status payload from GET /api/status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json: StatusPayload = await res.json();
      setData(json);
      setStatusError(null);
    } catch (err) {
      console.error('[Grafana Dashboard] Error fetching status:', err);
      setStatusError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll /api/status on configurable schedule
  useEffect(() => {
    fetchStatus();
    if (refreshIntervalSec <= 0) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, refreshIntervalSec * 1000);

    return () => clearInterval(interval);
  }, [fetchStatus, refreshIntervalSec]);

  // Trigger manual cron cycle via GET /api/cron?force=true
  const handleRunCronCycle = async () => {
    setIsRefreshingManual(true);
    try {
      await fetch('/api/cron?force=true', { cache: 'no-store' });
      await fetchStatus();
    } catch (err) {
      console.error('[Grafana Dashboard] Failed to execute cron cycle:', err);
    } finally {
      setIsRefreshingManual(false);
    }
  };

  // Trigger test failure alert simulation
  const handleTriggerTestAlert = async () => {
    try {
      await fetch('/api/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName: 'orders-api', status: 'critical', sendSlack: true }),
      });
      await fetchStatus();
    } catch (err) {
      console.error('[Grafana Dashboard] Test alert simulation failed:', err);
    }
  };

  // Log custom LLM task cost event
  const handleLogLlmEvent = async (provider: string, costUsd: number) => {
    try {
      await fetch('/api/events/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, costUsd, taskId: `task-${Date.now().toString(36)}` }),
      });
      await fetchStatus();
    } catch (err) {
      console.error('[Grafana Dashboard] Error logging LLM event:', err);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-[1600px] mx-auto bg-grafana-bg">
      {/* Grafana Top Navbar */}
      <GrafanaNavbar
        overallStatus={data?.summary.overallStatus || 'healthy'}
        refreshIntervalSec={refreshIntervalSec}
        onRefreshIntervalChange={setRefreshIntervalSec}
        onRunCronCycle={handleRunCronCycle}
        onTriggerTestAlert={handleTriggerTestAlert}
        isRefreshingManual={isRefreshingManual}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* Error banner if status fetch failed */}
      {statusError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-grafana-red rounded font-mono-data text-xs shadow-xs">
          ⚠️ Connection error fetching Grafana status metrics: {statusError}
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {loading && !data && (
        <div className="grafana-panel p-12 text-center text-grafana-muted font-mono-data text-xs space-y-3 bg-white">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-grafana-blue" />
          <p>Connecting to Operations Engine & Initializing Grafana Panels...</p>
        </div>
      )}

      {data && (
        <>
          {/* 1. Grafana Big Stat Summary Cards Strip */}
          <GrafanaStatCards
            services={data.services}
            totalSpendUsd={data.llmSpend.totalMonthToDateUsd}
            budgetUsd={data.llmSpend.budgetUsd}
            spendPercentage={data.llmSpend.spendPercentage}
            burnRatePerHourUsd={data.llmSpend.burnRatePerHourUsd}
            overallStatus={data.summary.overallStatus}
          />

          {/* 2. Pipeline Latency & Health Timeseries Panel */}
          <Heartbeat
            points={data.sparkline}
            overallStatus={data.summary.overallStatus}
            lastUpdated={data.summary.lastUpdated}
          />

          {/* 3. Main Dashboard Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 8 Cols: Spend Panel + Service Table */}
            <div className="lg:col-span-8 space-y-6">
              <SpendPanel
                totalSpendUsd={data.llmSpend.totalMonthToDateUsd}
                budgetUsd={data.llmSpend.budgetUsd}
                spendPercentage={data.llmSpend.spendPercentage}
                burnRatePerHourUsd={data.llmSpend.burnRatePerHourUsd}
                providerBreakdown={data.llmSpend.providerBreakdown}
                onLogLlmEvent={handleLogLlmEvent}
              />

              <ServiceTable services={data.services} />
            </div>

            {/* Right 4 Cols: Persistent Alert Feed */}
            <div className="lg:col-span-4 h-full">
              <AlertFeed
                alerts={data.alerts}
                onTriggerTestAlert={handleTriggerTestAlert}
              />
            </div>
          </div>

          {/* 4. Agent Tasks Attribution Table */}
          <AgentTasksTable />

          {/* 5. Grafana Footer Bar */}
          <footer className="grafana-panel mt-6 p-4 text-xs font-mono-data text-grafana-muted flex flex-col md:flex-row items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-grafana-blue" />
              <span>Target Cadence: <code className="text-grafana-text font-bold">*/5 * * * *</code></span>
              <span className="text-grafana-border">|</span>
              <span>Advisory Lock Key: <code className="text-grafana-text">727272</code></span>
              <span className="text-grafana-border">|</span>
              <span>Cluster: <code className="text-grafana-text font-bold">Production SaaS</code></span>
            </div>

            <div className="flex items-center gap-3">
              <a href="/api/status" target="_blank" className="hover:text-grafana-blue transition-colors">
                GET /api/status ↗
              </a>
              <a href="/api/cron?force=true" target="_blank" className="hover:text-grafana-blue transition-colors">
                GET /api/cron ↗
              </a>
            </div>
          </footer>
        </>
      )}
    </main>
  );
}
