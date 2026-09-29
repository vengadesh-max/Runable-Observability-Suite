import { describe, expect, it } from 'vitest';
import { createEmptyStatusPayload } from '../lib/statusPayload';

describe('createEmptyStatusPayload', () => {
  it('includes only explicitly configured integrations without invented telemetry', () => {
    const payload = createEmptyStatusPayload([
      { name: 'catalog-api', url: 'https://example.test/catalog' },
      { name: 'checkout-api', url: 'https://example.test/checkout' },
    ], true, 0, '2026-01-01T00:00:00.000Z');

    expect(payload.services.map((service) => service.serviceName)).toEqual([
      'primary-db',
      'catalog-api',
      'checkout-api',
    ]);
    expect(payload.services.every((service) => service.status === 'unknown')).toBe(true);
    expect(payload.services.every((service) => service.metricValue === null)).toBe(true);
    expect(payload.llmSpend.totalMonthToDateUsd).toBe(0);
    expect(payload.alerts).toEqual([]);
    expect(payload.sparkline).toEqual([]);
    expect(payload.configuration).toMatchObject({ databaseConfigured: true, monitoredServiceCount: 2, budgetConfigured: false });
  });
});
