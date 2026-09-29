/**
 * @file app/api/events/llm/route.ts
 * @description API endpoint to record per-agent LLM token consumption and cost usage events (§2.6).
 */

import { NextRequest, NextResponse } from 'next/server';
import { logLlmUsageEvent } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/llm
 * Payload: { provider: string, taskId?: string, inputTokens: number, outputTokens: number, costUsd: number }
 */
export async function POST(request: NextRequest) {
  try {
    const ingestionKey = process.env.INGEST_API_KEY;
    if (ingestionKey && request.headers.get('x-api-key') !== ingestionKey) {
      return NextResponse.json({ error: 'Unauthorized ingestion request.' }, { status: 401 });
    }
    const body = await request.json();

    if (typeof body.provider !== 'string' || !body.provider.trim() || typeof body.costUsd !== 'number' || !Number.isFinite(body.costUsd) || body.costUsd < 0) {
      return NextResponse.json(
        { error: 'Invalid payload. "provider" string and "costUsd" numeric fields are required.' },
        { status: 400 }
      );
    }

    const inputTokens = typeof body.inputTokens === 'number' && Number.isInteger(body.inputTokens) && body.inputTokens >= 0 ? body.inputTokens : 0;
    const outputTokens = typeof body.outputTokens === 'number' && Number.isInteger(body.outputTokens) && body.outputTokens >= 0 ? body.outputTokens : 0;
    const event = await logLlmUsageEvent({
      provider: body.provider.trim().toLowerCase(),
      taskId: body.taskId ? String(body.taskId) : undefined,
      inputTokens,
      outputTokens,
      costUsd: body.costUsd,
    });

    return NextResponse.json({ ok: true, event });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
