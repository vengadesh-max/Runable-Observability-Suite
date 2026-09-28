/**
 * @file app/api/seed/route.ts
 * @description API route to seed sample Runable company telemetry and multi-agent SaaS data.
 */

import { NextResponse } from 'next/server';
import { seedRunableSampleData } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await seedRunableSampleData();
    return NextResponse.json({ ok: true, message: 'Runable sample data ingested successfully' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
