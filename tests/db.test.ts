/**
 * @file tests/db.test.ts
 * @description Unit tests for database persistence, fallback memory store, and ledger queries.
 */

import { describe, it, expect } from 'vitest';
import {
  saveCheckResults,
  getLatestStatusPerService,
  getMonthToDateLlmSpend,
  logLlmUsageEvent,
  tryAdvisoryLock,
  unlockAdvisoryLock,
} from '../lib/db';
import { CheckResult } from '../lib/types';

describe('Database & Ledger Persistence', () => {
  it('should acquire and release advisory locks', async () => {
    const locked = await tryAdvisoryLock(727272);
    expect(locked).toBe(true);

    const unlocked = await unlockAdvisoryLock(727272);
    expect(unlocked).toBe(true);
  });

  it('should insert check results and query latest status per service', async () => {
    const testResults: CheckResult[] = [
      {
        checkType: 'api_watch',
        serviceName: 'test-orders-service',
        status: 'degraded',
        metricValue: 1850,
        metricUnit: 'ms',
        message: 'High latency observed',
      },
    ];

    const saved = await saveCheckResults(testResults);
    expect(saved).toHaveLength(1);
    expect(saved[0].serviceName).toBe('test-orders-service');

    const latest = await getLatestStatusPerService();
    const match = latest.find((r) => r.serviceName === 'test-orders-service');
    expect(match).toBeDefined();
    expect(match?.status).toBe('degraded');
  });

  it('should log LLM usage events and calculate Month-To-Date spend', async () => {
    await logLlmUsageEvent({
      provider: 'openai',
      taskId: 'test-agent-task-1',
      inputTokens: 1000,
      outputTokens: 500,
      costUsd: 2.5,
    });

    const spend = await getMonthToDateLlmSpend();
    expect(spend.totalSpendUsd).toBeGreaterThanOrEqual(2.5);
    expect(spend.providerBreakdown.openai).toBeGreaterThanOrEqual(2.5);
  });
});
