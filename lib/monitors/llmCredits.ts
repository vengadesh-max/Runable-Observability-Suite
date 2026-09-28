/**
 * @file lib/monitors/llmCredits.ts
 * @description LLM credit burn & budget tracking monitor for Multi-Agent SaaS platforms.
 */

import { CheckResult, Status } from '../types';
import { getMonthToDateLlmSpend } from '../db';

/** Default LLM providers monitored */
const DEFAULT_LLM_PROVIDERS = ['openai', 'anthropic', 'google-gemini'];

/**
 * Gets configured monthly LLM budget in USD.
 */
export function getMonthlyBudgetUsd(): number {
  const envVal = process.env.LLM_MONTHLY_BUDGET_USD;
  const parsed = envVal ? parseFloat(envVal) : 600;
  return isNaN(parsed) || parsed <= 0 ? 600 : parsed;
}

/**
 * Checks month-to-date LLM spend against self-declared budget (§2.3).
 * Thresholds:
 * - Spend >= 95% of budget: critical
 * - Spend >= 80% of budget: degraded
 * - Otherwise: healthy
 * @returns CheckResult[] for each provider
 */
export async function checkLlmCredits(): Promise<CheckResult[]> {
  const budgetUsd = getMonthlyBudgetUsd();
  const { totalSpendUsd, providerBreakdown } = await getMonthToDateLlmSpend();

  const spendPct = totalSpendUsd / budgetUsd;
  const spendPctFormatted = (spendPct * 100).toFixed(1);

  // Estimate burn rate per hour (assuming current calendar day offset)
  const now = new Date();
  const dayOfMonth = Math.max(1, now.getDate());
  const hoursPassedMonth = (dayOfMonth - 1) * 24 + now.getHours() + 1;
  const burnRatePerHour = totalSpendUsd / hoursPassedMonth;

  let overallStatus: Status = 'healthy';
  if (spendPct >= 0.95) {
    overallStatus = 'critical';
  } else if (spendPct >= 0.8) {
    overallStatus = 'degraded';
  }

  const results: CheckResult[] = [];

  // 1. Overall LLM budget summary result
  results.push({
    checkType: 'llm_credit',
    serviceName: 'llm-budget-total',
    status: overallStatus,
    metricValue: Math.round(totalSpendUsd * 100) / 100,
    metricUnit: 'usd',
    message: `MTD Spend: $${totalSpendUsd.toFixed(2)} / $${budgetUsd} (${spendPctFormatted}% of budget). Burn rate: ~$${burnRatePerHour.toFixed(2)}/hr`,
  });

  // 2. Individual provider breakdown results
  for (const provider of DEFAULT_LLM_PROVIDERS) {
    const providerSpend = providerBreakdown[provider] || 0;
    const providerPct = (providerSpend / budgetUsd) * 100;

    let providerStatus: Status = 'healthy';
    if (providerPct >= 80 || spendPct >= 0.95) {
      providerStatus = 'critical';
    } else if (providerPct >= 50 || spendPct >= 0.8) {
      providerStatus = 'degraded';
    }

    results.push({
      checkType: 'llm_credit',
      serviceName: `llm-${provider}`,
      status: providerStatus,
      metricValue: Math.round(providerSpend * 100) / 100,
      metricUnit: 'usd',
      message: `${provider.toUpperCase()} MTD spend: $${providerSpend.toFixed(2)} (~${((providerSpend / (totalSpendUsd || 1)) * 100).toFixed(0)}% of total LLM cost)`,
    });
  }

  return results;
}
