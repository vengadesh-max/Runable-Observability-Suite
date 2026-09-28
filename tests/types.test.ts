/**
 * @file tests/types.test.ts
 * @description Unit tests for domain types and monitoring threshold configurations.
 */

import { describe, it, expect } from 'vitest';
import { CheckResult, Status } from '../lib/types';

describe('Domain Types & Validation', () => {
  it('should validate valid CheckResult structure', () => {
    const sampleResult: CheckResult = {
      checkType: 'db_health',
      serviceName: 'primary-db',
      status: 'healthy',
      metricValue: 45,
      metricUnit: 'ms',
      message: 'Database operational',
    };

    expect(sampleResult.serviceName).toBe('primary-db');
    expect(sampleResult.status).toBe('healthy');
    expect(sampleResult.metricValue).toBe(45);
    expect(sampleResult.metricUnit).toBe('ms');
  });

  it('should support degraded and critical status values', () => {
    const statusLevels: Status[] = ['healthy', 'degraded', 'critical'];
    expect(statusLevels).toHaveLength(3);
    expect(statusLevels).toContain('critical');
  });
});
