'use client';

/**
 * @file components/GrafanaNavbar.tsx
 * @description Editorial Neoclassical Top Navigation Header.
 */

import React from 'react';
import { Activity, RefreshCw, Settings2 } from 'lucide-react';

interface GrafanaNavbarProps {
  overallStatus: string;
  refreshIntervalSec: number;
  onRefreshIntervalChange: (sec: number) => void;
  onRunCronCycle: () => Promise<void>;
  onOpenConfiguration: () => void;
  isRefreshingManual: boolean;
  canRunChecks: boolean;
  manualChecksAvailable: boolean;
}

export const GrafanaNavbar: React.FC<GrafanaNavbarProps> = ({
  overallStatus,
  refreshIntervalSec,
  onRefreshIntervalChange,
  onRunCronCycle,
  onOpenConfiguration,
  isRefreshingManual,
  canRunChecks,
  manualChecksAvailable,
}) => {
  const getStatusBadge = () => {
    if (overallStatus === 'unknown') {
      return null;
    }
    if (overallStatus === 'critical') {
      return (
        <span className="px-3 py-1 rounded text-xs font-mono-data font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
          CRITICAL INCIDENT
        </span>
      );
    }
    if (overallStatus === 'degraded') {
      return (
        <span className="px-3 py-1 rounded text-xs font-mono-data font-bold bg-amber-100 text-amber-800 border border-amber-300">
          DEGRADED
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded text-xs font-mono-data font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
        ALL SYSTEMS OPERATIONAL
      </span>
    );
  };

  return (
    <header className="editorial-card mb-6 bg-white border border-sand-border shadow-editorial">
      {/* Top Navbar Row */}
      <div className="px-6 py-4 border-b border-sand-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Editorial Brand Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-burgundy text-white flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-editorial-serif text-editorial-text italic tracking-wide">
                Observability
              </h1>
            </div>
            <p className="text-xs text-editorial-muted">
              Service health and usage telemetry
            </p>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-3 font-mono-data text-xs">
          {/* Auto Refresh Cadence Selector */}
          <div className="flex items-center gap-1.5 bg-sand-subtle px-3 py-1.5 rounded border border-sand-border">
            <RefreshCw className="w-3.5 h-3.5 text-editorial-muted" />
            <span className="text-editorial-muted">Refresh:</span>
            {[5, 15, 30, 0].map((sec) => (
              <button
                key={sec}
                onClick={() => onRefreshIntervalChange(sec)}
                className={`px-2 py-0.5 rounded font-semibold transition-all ${
                  refreshIntervalSec === sec
                    ? 'bg-burgundy text-white shadow-xs'
                    : 'text-editorial-muted hover:text-editorial-text'
                }`}
              >
                {sec === 0 ? 'Off' : `${sec}s`}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          {manualChecksAvailable && <button
            onClick={onRunCronCycle}
            disabled={isRefreshingManual || !canRunChecks}
            title={canRunChecks ? 'Run a monitoring check now' : 'Configure a database, endpoint, or spend budget first'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-burgundy hover:bg-burgundy-hover text-white font-semibold transition-all shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingManual ? 'animate-spin' : ''}`} />
            <span>{isRefreshingManual ? 'Executing...' : 'Run Cron Check'}</span>
          </button>}

          <button
            type="button"
            onClick={onOpenConfiguration}
            className="flex items-center gap-1.5 border border-sand-border bg-white px-3 py-1.5 font-semibold text-editorial-text transition-colors hover:bg-sand-subtle"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configuration
          </button>

          {getStatusBadge()}
        </div>
      </div>

      {/* Subheader Editorial Metadata Bar */}
      <div className="px-6 py-2.5 bg-sand-subtle text-[11px] font-mono-data text-editorial-muted flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span>Configure endpoints and credentials through environment variables.</span>
        </div>
      </div>
    </header>
  );
};
