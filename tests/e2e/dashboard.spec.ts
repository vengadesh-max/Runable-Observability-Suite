import { expect, test } from '@playwright/test';

test('shows an honest setup state before integrations are configured', async ({ page }) => {
  await page.route('**/api/status', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        services: [], sparkline: [], alerts: [],
        llmSpend: { totalMonthToDateUsd: 0, budgetUsd: 0, spendPercentage: 0, burnRatePerHourUsd: 0, providerBreakdown: {} },
        summary: { totalServices: 0, healthyCount: 0, degradedCount: 0, criticalCount: 0, overallStatus: 'unknown', lastUpdated: '2026-01-01T00:00:00.000Z' },
        configuration: { databaseConfigured: false, monitoredServiceCount: 0, slackConfigured: false, geminiConfigured: false, budgetConfigured: false, ingestionKeyConfigured: false, manualChecksAvailable: true },
      }),
    });
  });

  await page.goto('/');

  await expect(page.getByText('Initialising Observability Suite')).toHaveCount(0);
  await expect(page.getByText('Configuration required')).toBeVisible();
  await expect(page.getByText('No services configured. Add database and endpoint settings to your environment, then run a check.')).toBeVisible();
  await expect(page.getByText('No completed checks yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Configuration' }).click();
  await expect(page.getByRole('dialog', { name: 'Connect integrations' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy environment template' })).toBeVisible();
});
