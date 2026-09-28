/**
 * @file lib/alertEngine.ts
 * @description Evaluates check results against thresholds, enforces cooldown periods, and posts Slack alerts/recoveries.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { CheckResult, Status } from './types';
import { getPreviousCheckResult, markServiceAlerted, wasAlertedRecently } from './db';

/** Default cooldown period in minutes before re-alerting on the same service */
export function getCooldownMinutes(): number {
  const envVal = process.env.ALERT_COOLDOWN_MINUTES;
  const parsed = envVal ? parseInt(envVal, 10) : 15;
  return isNaN(parsed) || parsed <= 0 ? 15 : parsed;
}

/** Base dashboard URL for links in Slack alerts */
export function getDashboardUrl(): string {
  return process.env.DASHBOARD_URL || 'http://localhost:3000';
}

/**
 * Optional Gemini AI Incident Root-Cause Analysis.
 * Generates actionable diagnosis when an anomaly or critical alert occurs.
 */
async function generateAiIncidentDiagnosis(result: CheckResult): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
You are an expert Reliability Engineer for a Multi-Agent SaaS Platform.
Diagnose the following incident succinctly in 2 bullet points:
Service: ${result.serviceName} (${result.checkType})
Status: ${result.status.toUpperCase()}
Metric: ${result.metricValue ?? 'N/A'} ${result.metricUnit ?? ''}
Details: ${result.message}

Provide:
1. Likely Root Cause
2. Immediate Remediation Action
`;
    const response = await model.generateContent(prompt);
    return response.response.text().trim();
  } catch (err) {
    console.warn('[Pulse AlertEngine] Gemini AI diagnosis generation error:', err);
    return null;
  }
}

/**
 * Posts formatted Slack Block Kit alert message to incoming webhook.
 */
export async function sendSlackWebhook(payload: object): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Pulse AlertEngine] SLACK_WEBHOOK_URL not configured. Alert logged to stdout:', JSON.stringify(payload));
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[Pulse AlertEngine] Slack webhook HTTP error: ${res.status} ${res.statusText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Pulse AlertEngine] Failed to deliver Slack webhook:', err);
    return false;
  }
}

interface SlackBlock {
  type: 'header' | 'section' | 'context';
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text: string }[];
}

interface SlackAttachment {
  color: string;
  blocks: SlackBlock[];
}

/**
 * Formats and sends a Slack incident alert notification (§2.4).
 */
export async function sendSlackAlert(result: CheckResult): Promise<boolean> {
  const isCritical = result.status === 'critical';
  const colorHex = isCritical ? '#C4534A' : '#D9A441';
  const severityEmoji = isCritical ? '🔴 CRITICAL' : '⚠️ DEGRADED';
  const dashboardUrl = getDashboardUrl();

  const aiDiagnosis = await generateAiIncidentDiagnosis(result);

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${severityEmoji}: ${result.serviceName}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Category:*\n\`${result.checkType}\``,
        },
        {
          type: 'mrkdwn',
          text: `*Metric:*\n\`${result.metricValue ?? 'N/A'} ${result.metricUnit || ''}\``,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Incident Details:*\n${result.message}`,
      },
    },
  ];

  if (aiDiagnosis) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🤖 Gemini AI Incident Diagnosis:*\n${aiDiagnosis}`,
      },
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `<${dashboardUrl}|View Pulse Dashboard> | Time: ${new Date().toUTCString()}`,
      },
    ],
  });

  const attachment: SlackAttachment = {
    color: colorHex,
    blocks,
  };

  return sendSlackWebhook({ attachments: [attachment] });
}

/**
 * Sends a recovery Slack message when a previously alerted service returns to healthy.
 */
export async function sendSlackRecovery(result: CheckResult, downDurationMinutes: number): Promise<boolean> {
  const dashboardUrl = getDashboardUrl();
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `✅ RECOVERED: ${result.serviceName}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Service *${result.serviceName}* has returned to *HEALTHY* status.\n*Downtime Duration:* ~${downDurationMinutes} minutes.\n*Current Metric:* ${result.metricValue ?? 'N/A'} ${result.metricUnit || ''}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<${dashboardUrl}|View Pulse Dashboard> | Time: ${new Date().toUTCString()}`,
        },
      ],
    },
  ];

  const attachment: SlackAttachment = {
    color: '#4A9D6E',
    blocks,
  };

  return sendSlackWebhook({ attachments: [attachment] });
}

/**
 * Evaluates batch check results against thresholds and handles notifications (§2.4).
 */
export async function evaluateAndAlert(results: CheckResult[]): Promise<{ alertedCount: number; recoveryCount: number }> {
  const cooldownMinutes = getCooldownMinutes();
  let alertedCount = 0;
  let recoveryCount = 0;

  for (const r of results) {
    if (r.status === 'healthy') {
      const prev = await getPreviousCheckResult(r.serviceName);
      if (prev && prev.alerted && prev.status !== 'healthy') {
        const downMs = Date.now() - new Date(prev.checkedAt).getTime();
        const downMinutes = Math.max(1, Math.round(downMs / (1000 * 60)));
        await sendSlackRecovery(r, downMinutes);
        recoveryCount++;
      }
      continue;
    }

    // Cooldown check
    const isCoolingDown = await wasAlertedRecently(r.serviceName, cooldownMinutes);
    if (isCoolingDown) {
      console.log(`[Pulse AlertEngine] Cooldown active for ${r.serviceName}. Skipping duplicate alert.`);
      continue;
    }

    await sendSlackAlert(r);
    await markServiceAlerted(r.serviceName);
    alertedCount++;
  }

  return { alertedCount, recoveryCount };
}
