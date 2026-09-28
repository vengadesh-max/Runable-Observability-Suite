'use client';

/**
 * @file components/GrafanaNavbar.tsx
 * @description Grafana Workspace Top Navigation Bar component (Warm & Light theme).
 */

import React from 'react';
import { Activity, RefreshCw, Database, Clock, Zap, AlertTriangle, Layers, ChevronRight, Play, Pause } from 'lucide-react';

interface GrafanaNavbarProps {
  overallStatus: string;
  refreshIntervalSec: number;
  onRefreshIntervalChange: (sec: number) => void;
  onRunCronCycle: () => Promise<void>;
  onSeedSampleData: () => Promise<void>;
  onTriggerTestAlert: () => Promise<void>;
  isRefreshingManual: boolean;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
}

export const GrafanaNavbar: React.FC<GrafanaNavbarProps> = ({
  overallStatus,
  refreshIntervalSec,
  onRefreshIntervalChange,
  onRunCronCycle,
  onSeedSampleData,
  onTriggerTestAlert,
  isRefreshingManual,
  timeRange,
  onTimeRangeChange,
}) => {
  const getStatusBadge = () => {
    if (overallStatus === 'critical') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-mono-data font-bold badge-critical animate-pulse">
          CRITICAL ALERT
        </span>
      );
    }
    if (overallStatus === 'degraded') {
      return (
        <span className="px-2.5 py-1 rounded text-xs font-mono-data font-bold badge-degraded">
          DEGRADED
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded text-xs font-mono-data font-bold badge-healthy">
        SYSTEM OPERATIONAL
      </span>
    );
  };

  return (
    <header className="grafana-panel mb-6 bg-white border border-grafana-border shadow-sm">
      {/* Top Navbar Row */}
      <div className="px-4 py-3 border-b border-grafana-border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-mono-data">
          <div className="w-6 h-6 rounded bg-grafana-orange text-white flex items-center justify-center font-bold text-sm">
            G
          </div>
          <span className="font-semibold text-grafana-text">Grafana</span>
          <ChevronRight className="w-3.5 h-3.5 text-grafana-muted" />
          <span className="text-grafana-muted">Dashboards</span>
          <ChevronRight className="w-3.5 h-3.5 text-grafana-muted" />
          <span className="font-semibold text-grafana-text flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-grafana-orange inline-block" />
            Runable Multi-Agent SaaS Operations
          </span>
          {getStatusBadge()}
        </div>

        {/* Grafana Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 font-mono-data text-xs">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 bg-grafana-subtle px-2 py-1 rounded border border-grafana-border">
            <Clock className="w-3.5 h-3.5 text-grafana-muted" />
            <select
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="bg-transparent text-grafana-text font-semibold outline-none cursor-pointer"
            >
              <option value="5m">Last 5 minutes</option>
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
            </select>
          </div>

          {/* Auto Refresh Selector */}
          <div className="flex items-center gap-1 bg-grafana-subtle px-2 py-1 rounded border border-grafana-border">
            <RefreshCw className="w-3.5 h-3.5 text-grafana-muted" />
            <span className="text-grafana-muted">Refresh:</span>
            {[5, 15, 30, 0].map((sec) => (
              <button
                key={sec}
                onClick={() => onRefreshIntervalChange(sec)}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all ${
                  refreshIntervalSec === sec
                    ? 'bg-grafana-blue text-white'
                    : 'text-grafana-muted hover:text-grafana-text'
                }`}
              >
                {sec === 0 ? 'Off' : `${sec}s`}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <button
            onClick={onRunCronCycle}
            disabled={isRefreshingManual}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-grafana-blue hover:bg-blue-700 text-white font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingManual ? 'animate-spin' : ''}`} />
            <span>{isRefreshingManual ? 'Executing...' : 'Run Cron Check'}</span>
          </button>

          <button
            onClick={onSeedSampleData}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-grafana-subtle hover:bg-grafana-hover text-grafana-text font-semibold border border-grafana-border transition-all"
          >
            <Database className="w-3.5 h-3.5 text-grafana-orange" />
            <span>Ingest Runable Telemetry</span>
          </button>

          <button
            onClick={onTriggerTestAlert}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 text-grafana-red font-semibold border border-red-200 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Incident</span>
          </button>
        </div>
      </div>

      {/* Subheader Dashboard Metrics Summary Bar */}
      <div className="px-4 py-2 bg-grafana-subtle/50 text-[11px] font-mono-data text-grafana-muted flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span>Company: <strong className="text-grafana-text font-bold">Runable (runable.com)</strong></span>
          <span>Environment: <strong className="text-grafana-text font-bold">Production Multi-Agent Cluster</strong></span>
          <span>Alert Channel: <strong className="text-grafana-blue font-bold">#ops-pulse-alerts</strong></span>
        </div>
        <div>
          <span>Target Cadence: <strong className="text-grafana-text">*/5 * * * *</strong> (Vercel Cron)</span>
        </div>
      </div>
    </header>
  );
};
