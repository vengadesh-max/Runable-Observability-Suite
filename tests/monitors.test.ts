/**
 * @file tests/monitors.test.ts
 * @description Unit tests for DB health, API watch, and LLM credit monitors.
 */

import { describe, it, expect } from 'vitest';
import { checkDbHealth } from '../lib/monitors/dbHealth';
import { checkLlmCredits, getMonthlyBudgetUsd } from '../lib/monitors/llmCredits';
import { getMonitoredServicesConfig } from '../lib/monitors/apiWatch';

describe('Monitors Module', () => {
  it('does not run a database probe without an explicit database URL', async () => {
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
    const results = await checkDbHealth();
    expect(results).toEqual([]);
  });

  it('getMonthlyBudgetUsd only returns an explicitly configured budget', () => {
    delete process.env.LLM_MONTHLY_BUDGET_USD;
    expect(getMonthlyBudgetUsd()).toBe(0);

    process.env.LLM_MONTHLY_BUDGET_USD = '1200';
    expect(getMonthlyBudgetUsd()).toBe(1200);
    delete process.env.LLM_MONTHLY_BUDGET_USD;
  });

  it('checkLlmCredits does not invent spend without a configured budget', async () => {
    delete process.env.LLM_MONTHLY_BUDGET_USD;
    const results = await checkLlmCredits();
    expect(results).toEqual([]);
  });

  it('getMonitoredServicesConfig returns no services until URLs are configured', () => {
    delete process.env.MONITORED_SERVICES;
    expect(getMonitoredServicesConfig()).toEqual([]);
  });

  it('getMonitoredServicesConfig accepts only valid HTTP services and normalizes defaults', () => {
    process.env.MONITORED_SERVICES = JSON.stringify([
      { name: 'catalog', url: 'https://catalog.example.com/health' },
      { name: 'unsupported', url: 'ftp://example.com' },
      { name: '', url: 'https://example.com' },
    ]);

    expect(getMonitoredServicesConfig()).toEqual([
      { name: 'catalog', url: 'https://catalog.example.com/health', expectedStatus: 200, timeoutMs: 5000 },
    ]);
    delete process.env.MONITORED_SERVICES;
  });
});
