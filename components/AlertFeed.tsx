'use client';

/**
 * @file components/AlertFeed.tsx
 * @description Grafana-style Incident Log & Slack Alert Feed panel (Warm & Light theme).
 */

import React from 'react';
import { AlertFeedItem } from '@/lib/types';
import { Bell, AlertTriangle, ShieldAlert, CheckCircle, ExternalLink } from 'lucide-react';

interface AlertFeedProps {
  alerts: AlertFeedItem[];
  onTriggerTestAlert: () => Promise<void>;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ alerts, onTriggerTestAlert }) => {
  return (
    <div className="grafana-panel h-full flex flex-col justify-between">
      <div>
        {/* Panel Header */}
        <div className="grafana-panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-grafana-orange" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-grafana-text">
              Ops Incident & Slack Alert Feed
            </h2>
          </div>

          <button
            onClick={onTriggerTestAlert}
            className="text-[11px] font-mono-data px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-grafana-red border border-red-200 transition-all flex items-center gap-1 font-semibold"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Simulate Failure</span>
          </button>
        </div>

        {/* Feed List */}
        <div className="p-3 space-y-2.5 max-h-[520px] overflow-y-auto">
          {alerts.map((item) => {
            const isCritical = item.status === 'critical';
            const isRecovery = item.isRecovery;

            const borderClass = isRecovery
              ? 'border-l-4 border-l-grafana-green'
              : isCritical
              ? 'border-l-4 border-l-grafana-red'
              : 'border-l-4 border-l-grafana-amber';

            return (
              <div
                key={item.id}
                className={`p-3 rounded bg-grafana-subtle border border-grafana-border ${borderClass} font-mono-data text-xs space-y-1`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-grafana-text flex items-center gap-1.5">
                    {isRecovery ? (
                      <CheckCircle className="w-3.5 h-3.5 text-grafana-green" />
                    ) : isCritical ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-grafana-red" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-grafana-amber" />
                    )}
                    {item.serviceName}
                  </span>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isRecovery
                        ? 'badge-healthy'
                        : isCritical
                        ? 'badge-critical'
                        : 'badge-degraded'
                    }`}
                  >
                    {isRecovery ? 'RECOVERED' : item.status}
                  </span>
                </div>

                <p className="text-grafana-muted leading-snug">{item.message}</p>

                <div className="flex items-center justify-between text-[10px] text-grafana-dim pt-1 border-t border-grafana-border/50">
                  <span>Metric: {item.metricValue ?? 'N/A'} {item.metricUnit || ''}</span>
                  <span>{new Date(item.checkedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}

          {alerts.length === 0 && (
            <div className="p-6 text-center border border-dashed border-grafana-border rounded text-grafana-muted font-mono-data text-xs space-y-2 bg-grafana-subtle">
              <CheckCircle className="w-6 h-6 text-grafana-green mx-auto opacity-80" />
              <p className="font-semibold text-grafana-text">No active incidents logged in ledger.</p>
              <p className="text-[11px] text-grafana-muted">Use "Simulate Failure" button to test Slack alerts.</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-grafana-subtle border-t border-grafana-border text-[11px] text-grafana-muted font-mono-data flex items-center justify-between">
        <span>Channel: <strong className="text-grafana-text">#ops-pulse-alerts</strong></span>
        <span className="text-grafana-blue flex items-center gap-1 font-semibold">
          Cooldown: 15m <ExternalLink className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
};
