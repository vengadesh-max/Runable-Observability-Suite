'use client';

/**
 * @file components/SpendPanel.tsx
 * @description Grafana-style LLM Spend & Multi-Agent Credit Quota panel (Warm & Light theme).
 */

import React, { useState } from 'react';
import { Cpu, Flame, PlusCircle, Layers } from 'lucide-react';

interface SpendPanelProps {
  totalSpendUsd: number;
  budgetUsd: number;
  spendPercentage: number;
  burnRatePerHourUsd: number;
  providerBreakdown: Record<string, number>;
  onLogLlmEvent: (provider: string, costUsd: number) => Promise<void>;
}

export const SpendPanel: React.FC<SpendPanelProps> = ({
  totalSpendUsd,
  budgetUsd,
  spendPercentage,
  burnRatePerHourUsd,
  providerBreakdown,
  onLogLlmEvent,
}) => {
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [inputCost, setInputCost] = useState('5.00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(inputCost);
    if (isNaN(cost) || cost <= 0) return;

    setIsSubmitting(true);
    try {
      await onLogLlmEvent(selectedProvider, cost);
      setShowLogModal(false);
      setInputCost('5.00');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 95) return 'bg-grafana-red';
    if (pct >= 80) return 'bg-grafana-amber';
    return 'bg-grafana-green';
  };

  return (
    <div className="grafana-panel h-full flex flex-col justify-between">
      <div>
        {/* Panel Header */}
        <div className="grafana-panel-header flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-grafana-orange" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-grafana-text">
              LLM Spend & Multi-Agent Task Quota
            </h2>
          </div>

          <button
            onClick={() => setShowLogModal(true)}
            className="flex items-center gap-1 text-[11px] font-mono-data px-2 py-0.5 rounded bg-white hover:bg-grafana-hover text-grafana-text border border-grafana-border transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5 text-grafana-blue" />
            <span>Log Task Cost</span>
          </button>
        </div>

        {/* Panel Body */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-grafana-subtle rounded border border-grafana-border">
              <span className="text-[11px] font-mono-data text-grafana-muted block mb-1">MTD Spend</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-mono-data text-grafana-text">
                  ${totalSpendUsd.toFixed(2)}
                </span>
                <span className="text-xs text-grafana-muted font-mono-data">/ ${budgetUsd}</span>
              </div>
            </div>

            <div className="p-3 bg-grafana-subtle rounded border border-grafana-border">
              <span className="text-[11px] font-mono-data text-grafana-muted block mb-1">Burn Rate</span>
              <div className="flex items-center gap-1 text-xl font-bold font-mono-data text-grafana-text">
                <Flame className="w-4 h-4 text-grafana-orange" />
                <span>${burnRatePerHourUsd.toFixed(2)}</span>
                <span className="text-xs font-normal text-grafana-muted">/hr</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono-data mb-1">
              <span className="text-grafana-muted">Monthly Quota Consumption</span>
              <span className={spendPercentage >= 80 ? 'text-grafana-amber font-bold' : 'text-grafana-text font-bold'}>
                {spendPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-grafana-subtle rounded-full overflow-hidden border border-grafana-border">
              <div
                className={`h-full ${getProgressColor(spendPercentage)} transition-all duration-500`}
                style={{ width: `${Math.min(100, spendPercentage)}%` }}
              />
            </div>
          </div>

          {/* Provider Cost Breakdown */}
          <div>
            <div className="flex items-center gap-1 text-xs font-mono-data text-grafana-muted mb-2">
              <Layers className="w-3.5 h-3.5 text-grafana-muted" />
              <span>Provider Cost Attribution</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono-data">
              {Object.entries(providerBreakdown).map(([provider, cost]) => (
                <div key={provider} className="p-2 bg-grafana-subtle rounded border border-grafana-border">
                  <span className="text-grafana-muted uppercase text-[10px] block truncate">{provider}</span>
                  <span className="font-semibold text-grafana-text">${cost.toFixed(2)}</span>
                </div>
              ))}
              {Object.keys(providerBreakdown).length === 0 && (
                <span className="text-xs text-grafana-muted italic col-span-3">No LLM events logged yet this month.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log Task Cost Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="grafana-panel p-6 w-full max-w-md bg-white border border-grafana-border shadow-xl">
            <h3 className="text-sm font-semibold mb-1 text-grafana-text font-mono-data">Log Agent Task LLM Usage</h3>
            <p className="text-xs text-grafana-muted mb-4 font-mono-data">Record token cost event into Runable ledger</p>

            <form onSubmit={handleSubmitEvent} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-grafana-muted mb-1 font-medium">Provider</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full p-2 bg-grafana-subtle border border-grafana-border rounded text-grafana-text focus:border-grafana-blue outline-none"
                >
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude 3.5)</option>
                  <option value="google-gemini">Google Gemini 1.5</option>
                </select>
              </div>

              <div>
                <label className="block text-grafana-muted mb-1 font-medium">Cost (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-grafana-muted">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={inputCost}
                    onChange={(e) => setInputCost(e.target.value)}
                    className="w-full p-2 pl-7 bg-grafana-subtle border border-grafana-border rounded text-grafana-text focus:border-grafana-blue outline-none font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-3 py-1.5 rounded bg-grafana-subtle hover:bg-grafana-hover text-grafana-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-grafana-blue hover:bg-blue-700 text-white font-semibold transition-all shadow-sm"
                >
                  {isSubmitting ? 'Logging...' : 'Log Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
