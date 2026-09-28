/**
 * @file tests/monitors.test.ts
 * @description Unit tests for DB health, API watch, and LLM credit monitors.
 */

import { describe, it, expect, vi } from 'vitest';
import { checkDbHealth } from '../lib/monitors/dbHealth';
import { checkLlmCredits, getMonthlyBudgetUsd } from '../lib/monitors/llmCredits';
import { getMonitoredServicesConfig } from '../lib/monitors/apiWatch';

describe('Monitors Module', () => {
  it('checkDbHealth should return a valid CheckResult for primary-db', async () => {
    const results = await checkDbHealth();
    expect(results).toHaveLength(1);

    const dbResult = results[0];
    expect(dbResult.serviceName).toBe('primary-db');
    expect(dbResult.checkType).toBe('db_health');
    expect(['healthy', 'degraded', 'critical']).toContain(dbResult.status);
    expect(dbResult.metricUnit).toBe('ms');
  });

  it('getMonthlyBudgetUsd should return configured or default $600 budget', () => {
    delete process.env.LLM_MONTHLY_BUDGET_USD;
    expect(getMonthlyBudgetUsd()).toBe(600);

    process.env.LLM_MONTHLY_BUDGET_USD = '1200';
    expect(getMonthlyBudgetUsd()).toBe(1200);
    delete process.env.LLM_MONTHLY_BUDGET_USD;
  });

  it('checkLlmCredits should calculate spend percentage and provider breakdowns', async () => {
    const results = await checkLlmCredits();
    expect(results.length).toBeGreaterThanOrEqual(2);

    const budgetTotalResult = results.find((r) => r.serviceName === 'llm-budget-total');
    expect(budgetTotalResult).toBeDefined();
    expect(budgetTotalResult?.metricUnit).toBe('usd');
  });

  it('getMonitoredServicesConfig should parse MONITORED_SERVICES JSON or return defaults', () => {
    delete process.env.MONITORED_SERVICES;
    const defaults = getMonitoredServicesConfig();
    expect(defaults.length).toBeGreaterThan(0);
    expect(defaults[0].name).toBe('orders-api');
  });
});
