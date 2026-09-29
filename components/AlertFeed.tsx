'use client';

/**
 * @file components/AlertFeed.tsx
 * @description Editorial Neoclassical Incident Log & Slack Alert Feed panel.
 */

import React from 'react';
import { AlertFeedItem } from '@/lib/types';
import { Bell, AlertTriangle, ShieldAlert, CheckCircle, ExternalLink } from 'lucide-react';

interface AlertFeedProps {
  alerts: AlertFeedItem[];
}

export const AlertFeed: React.FC<AlertFeedProps> = ({ alerts = [] }) => {
  return (
    <div className="editorial-card h-full flex flex-col justify-between bg-white">
      <div>
        {/* Panel Header */}
        <div className="editorial-header-strip flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-burntOrange" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-editorial-text font-editorial-serif italic">
              Ops Incident & Slack Alert Feed
            </h2>
          </div>

        </div>

        {/* Feed List */}
        <div className="p-3 space-y-2.5 max-h-[520px] overflow-y-auto">
          {alerts.map((item) => {
            const isCritical = item.status === 'critical';
            const isRecovery = item.isRecovery;

            const borderClass = isRecovery
              ? 'border-l-4 border-l-emerald-600'
              : isCritical
              ? 'border-l-4 border-l-burgundy'
              : 'border-l-4 border-l-burntOrange';

            return (
              <div
                key={item.id}
                className={`p-3 rounded bg-sand-subtle border border-sand-border ${borderClass} font-mono-data text-xs space-y-1`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-editorial-text flex items-center gap-1.5 font-sans">
                    {isRecovery ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                    ) : isCritical ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-burgundy" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-burntOrange" />
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

                <p className="text-editorial-muted leading-snug">{item.message}</p>

                <div className="flex items-center justify-between text-[10px] text-editorial-dim pt-1 border-t border-sand-border">
                  <span>Metric: {item.metricValue ?? 'N/A'} {item.metricUnit || ''}</span>
                  <span>{new Date(item.checkedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })}

          {alerts.length === 0 && (
            <div className="p-6 text-center border border-dashed border-sand-border rounded text-editorial-muted font-mono-data text-xs space-y-2 bg-sand-subtle">
              <CheckCircle className="w-6 h-6 text-emerald-700 mx-auto opacity-80" />
              <p className="font-semibold text-editorial-text font-editorial-serif italic">No incidents recorded.</p>
              <p className="text-[11px] text-editorial-muted">Connect a monitored endpoint to begin collecting alerts.</p>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 bg-sand-subtle border-t border-sand-border text-[11px] text-editorial-muted font-mono-data flex items-center justify-between">
        <span>Alerts are delivered when a Slack webhook is configured.</span>
        <ExternalLink className="w-3 h-3 text-editorial-muted" />
      </div>
    </div>
  );
};
