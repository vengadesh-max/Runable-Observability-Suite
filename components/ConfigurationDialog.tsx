'use client';

import { Check, Copy, Database, DollarSign, KeyRound, Server, Sparkles, X } from 'lucide-react';
import React, { useState } from 'react';
import { StatusPayload } from '@/lib/types';

interface ConfigurationDialogProps {
  configuration: StatusPayload['configuration'];
  open: boolean;
  onClose: () => void;
}

const envTemplate = `POSTGRES_URL=
MONITORED_SERVICES=[]
SLACK_WEBHOOK_URL=
GEMINI_API_KEY=
LLM_MONTHLY_BUDGET_USD=
INGEST_API_KEY=
ALERT_COOLDOWN_MINUTES=
CRON_SECRET=
DASHBOARD_URL=`;

export function ConfigurationDialog({ configuration, open, onClose }: ConfigurationDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(envTemplate);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const items = [
    { label: 'Database', detail: 'POSTGRES_URL', configured: configuration.databaseConfigured, icon: Database },
    { label: 'Endpoints', detail: `${configuration.monitoredServiceCount} configured`, configured: configuration.monitoredServiceCount > 0, icon: Server },
    { label: 'Alerting', detail: 'SLACK_WEBHOOK_URL', configured: configuration.slackConfigured, icon: KeyRound },
    { label: 'Gemini diagnosis', detail: 'GEMINI_API_KEY', configured: configuration.geminiConfigured, icon: Sparkles },
    { label: 'Usage ingestion', detail: configuration.ingestionKeyConfigured ? 'Key protected' : 'No key configured', configured: configuration.ingestionKeyConfigured, icon: KeyRound },
    { label: 'Spend budget', detail: 'LLM_MONTHLY_BUDGET_USD', configured: configuration.budgetConfigured, icon: DollarSign },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true" aria-labelledby="configuration-title">
      <div className="editorial-card w-full max-w-xl bg-white shadow-xl">
        <div className="editorial-header-strip flex items-center justify-between">
          <div>
            <h2 id="configuration-title" className="font-editorial-serif text-lg font-semibold text-editorial-text">Connect integrations</h2>
            <p className="mt-1 text-xs font-mono-data text-editorial-muted">Configuration is read from environment variables when the app starts.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center border border-sand-border text-editorial-muted hover:bg-white hover:text-editorial-text" aria-label="Close configuration" title="Close configuration">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          {items.map(({ label, detail, configured, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 border border-sand-border bg-sand-subtle p-3">
              <Icon className="h-4 w-4 text-burgundy" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-editorial-text">{label}</p>
                <p className="truncate font-mono-data text-[11px] text-editorial-muted">{detail}</p>
              </div>
              <span className={configured ? 'text-emerald-700' : 'text-stone-400'} aria-label={configured ? 'Configured' : 'Not configured'}>
                <Check className="h-4 w-4" />
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-sand-border p-4">
          <p className="mb-2 text-xs text-editorial-muted">Add the required values to `.env`, restart the server, then run a check.</p>
          <button type="button" onClick={copyTemplate} className="flex items-center gap-2 border border-sand-border bg-white px-3 py-2 text-xs font-semibold text-editorial-text hover:bg-sand-subtle">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy environment template'}
          </button>
        </div>
      </div>
    </div>
  );
}
