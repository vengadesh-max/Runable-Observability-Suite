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
    const body = await request.json();

    if (!body.provider || typeof body.costUsd !== 'number') {
      return NextResponse.json(
        { error: 'Invalid payload. "provider" string and "costUsd" numeric fields are required.' },
        { status: 400 }
      );
    }

    const event = await logLlmUsageEvent({
      provider: String(body.provider).toLowerCase(),
      taskId: body.taskId ? String(body.taskId) : undefined,
      inputTokens: typeof body.inputTokens === 'number' ? body.inputTokens : 0,
      outputTokens: typeof body.outputTokens === 'number' ? body.outputTokens : 0,
      costUsd: Math.max(0, body.costUsd),
    });

    return NextResponse.json({ ok: true, event });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
