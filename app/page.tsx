'use client';

/**
 * @file app/page.tsx
 * @description Observability Suite — Main dashboard for Multi-Agent Operations & SaaS Infrastructure.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusPayload } from '@/lib/types';
import { createEmptyStatusPayload } from '@/lib/statusPayload';
import { GrafanaNavbar } from '@/components/GrafanaNavbar';
import { GrafanaStatCards } from '@/components/GrafanaStatCards';
import { Heartbeat } from '@/components/Heartbeat';
import { SpendPanel } from '@/components/SpendPanel';
import { ServiceTable } from '@/components/ServiceTable';
import { AlertFeed } from '@/components/AlertFeed';
import { ConfigurationDialog } from '@/components/ConfigurationDialog';
import { Terminal } from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<StatusPayload>(() => createEmptyStatusPayload());
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(15);
  const [isRefreshingManual, setIsRefreshingManual] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [configurationOpen, setConfigurationOpen] = useState(false);

  const fetchStatus = useCallback(async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch('/api/status', { cache: 'no-store', signal: controller.signal });
      if (!res.ok) {
        setData(createEmptyStatusPayload());
        throw new Error(`HTTP ${res.status} — service unavailable`);
      }
      const json: StatusPayload = await res.json();
      setData(json);
      setStatusError(null);
    } catch (err) {
      console.error('[ObsSuite Dashboard] Error fetching status:', err);
      setStatusError(err instanceof Error && err.name === 'AbortError' ? 'Status request timed out after 5 seconds' : err instanceof Error ? err.message : String(err));
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    if (refreshIntervalSec <= 0) return;
    const interval = setInterval(fetchStatus, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshIntervalSec]);

  const handleRunCronCycle = async () => {
    const canRunChecks = data.configuration.databaseConfigured || data.configuration.monitoredServiceCount > 0 || data.configuration.budgetConfigured;
    if (!canRunChecks) {
      setConfigurationOpen(true);
      return;
    }
    setIsRefreshingManual(true);
    try {
      const response = await fetch('/api/cron?force=true', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Check request failed with HTTP ${response.status}`);
      await fetchStatus();
    } catch (err) {
      console.error('[ObsSuite Dashboard] Failed to execute cron cycle:', err);
      setStatusError(err instanceof Error ? err.message : 'Unable to run a monitoring check.');
    } finally {
      setIsRefreshingManual(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-[1600px] mx-auto bg-bg">

      <GrafanaNavbar
        overallStatus={data.summary.overallStatus}
        refreshIntervalSec={refreshIntervalSec}
        onRefreshIntervalChange={setRefreshIntervalSec}
        onRunCronCycle={handleRunCronCycle}
        onOpenConfiguration={() => setConfigurationOpen(true)}
        isRefreshingManual={isRefreshingManual}
        canRunChecks={data.configuration.databaseConfigured || data.configuration.monitoredServiceCount > 0 || data.configuration.budgetConfigured}
        manualChecksAvailable={data.configuration.manualChecksAvailable}
      />

      {statusError && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-sm font-mono-data text-xs flex items-start gap-3">
          <span className="text-rose-500 mt-0.5 text-base">⚠</span>
          <div>
            <p className="font-bold text-rose-900 mb-0.5">Telemetry signal lost</p>
            <p className="text-rose-700">{statusError}</p>
          </div>
        </div>
      )}

      {data.summary.overallStatus === 'unknown' && (
        <section className="mb-6 border border-stone-300 bg-stone-50 p-4 text-sm text-stone-700">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-editorial-text">Configuration required</p>
              <p className="mt-1 text-xs">Connect a database or at least one monitored endpoint to begin collecting telemetry.</p>
            </div>
            <button type="button" onClick={() => setConfigurationOpen(true)} className="border border-stone-400 bg-white px-3 py-2 text-xs font-semibold text-editorial-text hover:bg-stone-100">
              Open configuration
            </button>
          </div>
        </section>
      )}

      <>
          <GrafanaStatCards
            services={data.services}
            totalSpendUsd={data.llmSpend.totalMonthToDateUsd}
            budgetUsd={data.llmSpend.budgetUsd}
            spendPercentage={data.llmSpend.spendPercentage}
            burnRatePerHourUsd={data.llmSpend.burnRatePerHourUsd}
            overallStatus={data.summary.overallStatus}
          />

          <Heartbeat
            points={data.sparkline}
            overallStatus={data.summary.overallStatus}
            lastUpdated={data.summary.lastUpdated}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-6">
              <SpendPanel
                totalSpendUsd={data.llmSpend.totalMonthToDateUsd}
                budgetUsd={data.llmSpend.budgetUsd}
                spendPercentage={data.llmSpend.spendPercentage}
                burnRatePerHourUsd={data.llmSpend.burnRatePerHourUsd}
                providerBreakdown={data.llmSpend.providerBreakdown}
              />
              <ServiceTable services={data.services} />
            </div>

            <div className="lg:col-span-4">
              <AlertFeed
                alerts={data.alerts}
              />
            </div>
          </div>

          <footer className="editorial-card mt-6 p-4 text-xs font-mono-data text-editorial-muted flex flex-col md:flex-row items-center justify-between gap-3 bg-sand-subtle">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Monitoring runs when the scheduled check is configured.
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/api/status" target="_blank" rel="noopener noreferrer"
                className="hover:text-burgundy transition-colors">
                Status API
              </a>
            </div>
          </footer>
      </>
      <ConfigurationDialog
        configuration={data.configuration}
        open={configurationOpen}
        onClose={() => setConfigurationOpen(false)}
      />
    </main>
  );
}
