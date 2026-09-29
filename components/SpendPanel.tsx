'use client';

/**
 * @file components/SpendPanel.tsx
 * @description Editorial Neoclassical LLM Spend & Multi-Agent Task Quota panel.
 */

import React from 'react';
import { Cpu, Flame, Layers } from 'lucide-react';

interface SpendPanelProps {
  totalSpendUsd: number;
  budgetUsd: number;
  spendPercentage: number;
  burnRatePerHourUsd: number;
  providerBreakdown: Record<string, number>;
}

export const SpendPanel: React.FC<SpendPanelProps> = ({
  totalSpendUsd = 0,
  budgetUsd = 0,
  spendPercentage = 0,
  burnRatePerHourUsd = 0,
  providerBreakdown = {},
}) => {
  const getProgressColor = (pct: number) => {
    if (pct >= 95) return 'bg-burgundy';
    if (pct >= 80) return 'bg-burntOrange';
    return 'bg-emerald-700';
  };

  return (
    <div className="editorial-card h-full flex flex-col justify-between bg-white">
      <div>
        {/* Panel Header */}
        <div className="editorial-header-strip flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-burntOrange" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-editorial-text font-editorial-serif italic">
              LLM Spend & Multi-Agent Task Quota
            </h2>
          </div>

        </div>

        {/* Panel Body */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-sand-subtle rounded border border-sand-border">
              <span className="text-[11px] font-mono-data text-editorial-muted block mb-1">MTD Spend</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-editorial-serif text-editorial-text">
                  {totalSpendUsd > 0 || Object.keys(providerBreakdown).length > 0 ? `$${totalSpendUsd.toFixed(2)}` : 'No data'}
                </span>
                <span className="text-xs text-editorial-muted font-mono-data">{budgetUsd > 0 ? `/ $${budgetUsd}` : 'Budget not configured'}</span>
              </div>
            </div>

            <div className="p-3 bg-sand-subtle rounded border border-sand-border">
              <span className="text-[11px] font-mono-data text-editorial-muted block mb-1">Burn Rate</span>
              <div className="flex items-center gap-1 text-xl font-bold font-editorial-serif text-editorial-text">
                <Flame className="w-4 h-4 text-burntOrange" />
                <span>{burnRatePerHourUsd > 0 ? `$${burnRatePerHourUsd.toFixed(2)}` : 'No data'}</span>
                {burnRatePerHourUsd > 0 && <span className="text-xs font-normal text-editorial-muted font-sans">/hr</span>}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono-data mb-1">
              <span className="text-editorial-muted">Monthly Quota Consumption</span>
              <span className={spendPercentage >= 80 ? 'text-burntOrange font-bold' : 'text-editorial-text font-bold'}>
                {spendPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-sand-subtle rounded-full overflow-hidden border border-sand-border">
              <div
                className={`h-full ${getProgressColor(spendPercentage)} transition-all duration-500`}
                style={{ width: `${Math.min(100, spendPercentage)}%` }}
              />
            </div>
          </div>

          {/* Provider Cost Attribution */}
          <div>
            <div className="flex items-center gap-1 text-xs font-mono-data text-editorial-muted mb-2">
              <Layers className="w-3.5 h-3.5 text-editorial-muted" />
              <span>Provider Cost Attribution</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono-data">
              {Object.entries(providerBreakdown).map(([provider, cost]) => (
                <div key={provider} className="p-2 bg-sand-subtle rounded border border-sand-border">
                  <span className="text-editorial-muted uppercase text-[10px] block truncate">{provider}</span>
                  <span className="font-semibold text-editorial-text">${cost.toFixed(2)}</span>
                </div>
              ))}
              {Object.keys(providerBreakdown).length === 0 && (
                <span className="text-xs text-editorial-muted italic col-span-3">No LLM events logged yet this month.</span>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
