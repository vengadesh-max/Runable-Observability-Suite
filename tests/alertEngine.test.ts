/**
 * @file tests/alertEngine.test.ts
 * @description Unit tests for alert evaluation, cooldown checks, and Slack payload generation.
 */

import { describe, it, expect } from 'vitest';
import { evaluateAndAlert, getCooldownMinutes, sendSlackWebhook } from '../lib/alertEngine';
import { CheckResult } from '../lib/types';

describe('Alert Engine', () => {
  it('should return default 15 minute cooldown period', () => {
    delete process.env.ALERT_COOLDOWN_MINUTES;
    expect(getCooldownMinutes()).toBe(15);
  });

  it('evaluateAndAlert should skip healthy results without previous alert history', async () => {
    const results: CheckResult[] = [
      {
        checkType: 'api_watch',
        serviceName: 'test-healthy-service',
        status: 'healthy',
        metricValue: 120,
        metricUnit: 'ms',
        message: 'Service responsive',
      },
    ];

    const { alertedCount, recoveryCount } = await evaluateAndAlert(results);
    expect(alertedCount).toBe(0);
    expect(recoveryCount).toBe(0);
  });

  it('sendSlackWebhook should gracefully log stdout if SLACK_WEBHOOK_URL is missing', async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const delivered = await sendSlackWebhook({ text: 'Test message' });
    expect(delivered).toBe(false);
  });
});
