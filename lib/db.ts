/**
 * @file lib/db.ts
 * @description PostgreSQL database client initialization, schema migrations, and ledger persistence methods.
 * Supports Postgres connection pooling with a resilient fallback in-memory store for local dev.
 */

import { Pool, PoolClient } from 'pg';
import { CheckResult, LedgerRow, LlmUsageEvent } from './types';

// Global singleton pool across hot-reloads in Next.js development mode
const globalForPg = global as unknown as { pgPool?: Pool };

function getPgUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

export const pool =
  globalForPg.pgPool ||
  new Pool({
    connectionString: getPgUrl(),
    ssl: process.env.NODE_ENV === 'production' || getPgUrl()?.includes('vercel-storage.com') || getPgUrl()?.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

// In-Memory fallback store for environments without a running Postgres instance
interface InMemoryStore {
  ledger: LedgerRow[];
  llmEvents: LlmUsageEvent[];
  probeValue: string;
  nextLedgerId: number;
  nextEventId: number;
}

const memoryStore: InMemoryStore = {
  ledger: [],
  llmEvents: [],
  probeValue: 'healthy_probe_initial',
  nextLedgerId: 1,
  nextEventId: 1,
};

let dbInitialized = false;

/**
 * Ensures the monitoring_ledger and llm_usage_events tables exist in PostgreSQL.
 */
export async function initDatabase(): Promise<boolean> {
  if (dbInitialized) return true;
  const connectionString = getPgUrl();
  if (!connectionString) {
    console.warn('[ObsSuite DB] No POSTGRES_URL configured. Using in-memory fallback ledger.');
    dbInitialized = true;
    return false;
  }

  let client: PoolClient | null = null;
  try {
    client = await pool.connect();

    // 1. Primary Monitoring Ledger Table (§3.1)
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitoring_ledger (
        id              BIGSERIAL PRIMARY KEY,
        check_type      TEXT NOT NULL CHECK (check_type IN ('llm_credit', 'db_health', 'api_watch')),
        service_name    TEXT NOT NULL,
        status          TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),
        metric_value    NUMERIC,
        metric_unit     TEXT CHECK (metric_unit IN ('usd', 'ms', 'pct')),
        message         TEXT NOT NULL,
        alerted         BOOLEAN NOT NULL DEFAULT false,
        checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes for high performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_service_time ON monitoring_ledger (service_name, checked_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ledger_status_time ON monitoring_ledger (status, checked_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ledger_alerted ON monitoring_ledger (alerted, checked_at DESC) WHERE alerted = true;
    `);

    // 2. Health probe table for dbHealth monitor write/read tests (§2.3)
    await client.query(`
      CREATE TABLE IF NOT EXISTS health_probe (
        id INT PRIMARY KEY,
        probe_value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      INSERT INTO health_probe (id, probe_value) VALUES (1, 'initial_probe')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 3. Optional agent LLM usage attribution table (§2.6)
    await client.query(`
      CREATE TABLE IF NOT EXISTS llm_usage_events (
        id            BIGSERIAL PRIMARY KEY,
        provider      TEXT NOT NULL,
        task_id       TEXT,
        input_tokens  INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd      NUMERIC NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    dbInitialized = true;
    console.log('[ObsSuite DB] Database tables and indexes successfully initialized.');
    return true;
  } catch (error) {
    console.warn('[ObsSuite DB] Failed to connect or initialize Postgres. Falling back to in-memory store:', error instanceof Error ? error.message : error);
    dbInitialized = true; // prevent repeated failing retries in single request
    return false;
  } finally {
    if (client) client.release();
  }
}

/**
 * Attempts to acquire PostgreSQL advisory lock to prevent concurrent cron execution (§1.4).
 * @param lockId Numeric advisory lock key (default: 727272)
 */
export async function tryAdvisoryLock(lockId = 727272): Promise<boolean> {
  const pgUrl = getPgUrl();
  if (!pgUrl) return true; // allow execution in memory mode

  try {
    const res = await pool.query('SELECT pg_try_advisory_lock($1) AS locked', [lockId]);
    return Boolean(res.rows[0]?.locked);
  } catch (err) {
    console.warn('[ObsSuite DB] Advisory lock acquisition error:', err);
    return true;
  }
}

/**
 * Releases PostgreSQL advisory lock after cron execution (§1.4).
 * @param lockId Numeric advisory lock key (default: 727272)
 */
export async function unlockAdvisoryLock(lockId = 727272): Promise<boolean> {
  const pgUrl = getPgUrl();
  if (!pgUrl) return true;

  try {
    const res = await pool.query('SELECT pg_advisory_unlock($1) AS unlocked', [lockId]);
    return Boolean(res.rows[0]?.unlocked);
  } catch (err) {
    console.warn('[ObsSuite DB] Advisory lock release error:', err);
    return false;
  }
}

/**
 * Inserts a batch of CheckResult items into the monitoring ledger.
 */
export async function saveCheckResults(results: CheckResult[]): Promise<LedgerRow[]> {
  await initDatabase();
  const savedRows: LedgerRow[] = [];

  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      for (const r of results) {
        const query = `
          INSERT INTO monitoring_ledger (check_type, service_name, status, metric_value, metric_unit, message, alerted, checked_at)
          VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
          RETURNING id, check_type AS "checkType", service_name AS "serviceName", status, metric_value AS "metricValue", metric_unit AS "metricUnit", message, alerted, checked_at AS "checkedAt";
        `;
        const values = [r.checkType, r.serviceName, r.status, r.metricValue, r.metricUnit, r.message];
        const res = await pool.query(query, values);
        const row = res.rows[0];
        savedRows.push({
          ...row,
          metricValue: row.metricValue !== null ? parseFloat(row.metricValue) : null,
          checkedAt: new Date(row.checkedAt).toISOString(),
        });
      }
      return savedRows;
    } catch (err) {
      console.warn('[ObsSuite DB] Failed to save to Postgres, falling back to memory store:', err);
    }
  }

  // Fallback to In-Memory Store
  const nowStr = new Date().toISOString();
  for (const r of results) {
    const newRow: LedgerRow = {
      id: memoryStore.nextLedgerId++,
      checkType: r.checkType,
      serviceName: r.serviceName,
      status: r.status,
      metricValue: r.metricValue,
      metricUnit: r.metricUnit,
      message: r.message,
      alerted: false,
      checkedAt: nowStr,
    };
    memoryStore.ledger.unshift(newRow);
    savedRows.push(newRow);
  }
  return savedRows;
}

/**
 * Marks a ledger row or service name as alerted in the monitoring ledger.
 */
export async function markServiceAlerted(serviceName: string): Promise<void> {
  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      await pool.query(
        `UPDATE monitoring_ledger SET alerted = true WHERE id IN (
          SELECT id FROM monitoring_ledger WHERE service_name = $1 ORDER BY checked_at DESC LIMIT 1
        )`,
        [serviceName]
      );
      return;
    } catch (err) {
      console.warn('[ObsSuite DB] Error marking service alerted in Postgres:', err);
    }
  }

  const latest = memoryStore.ledger.find((r) => r.serviceName === serviceName);
  if (latest) {
    latest.alerted = true;
  }
}

/**
 * Checks if a service was recently alerted within the cooldown period (§2.4).
 */
export async function wasAlertedRecently(serviceName: string, cooldownMinutes: number): Promise<boolean> {
  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      const res = await pool.query(
        `SELECT EXISTS(
          SELECT 1 FROM monitoring_ledger
          WHERE service_name = $1 AND alerted = true AND checked_at > NOW() - ($2 || ' minutes')::INTERVAL
        ) AS alerted_recently;`,
        [serviceName, cooldownMinutes]
      );
      return Boolean(res.rows[0]?.alerted_recently);
    } catch (err) {
      console.warn('[ObsSuite DB] Error checking cooldown in Postgres:', err);
    }
  }

  const cutoff = Date.now() - cooldownMinutes * 60 * 1000;
  return memoryStore.ledger.some(
    (r) => r.serviceName === serviceName && r.alerted && new Date(r.checkedAt).getTime() > cutoff
  );
}

/**
 * Retrieves the most recent ledger row for a specific service.
 */
export async function getPreviousCheckResult(serviceName: string): Promise<LedgerRow | null> {
  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      const res = await pool.query(
        `SELECT id, check_type AS "checkType", service_name AS "serviceName", status, metric_value AS "metricValue", metric_unit AS "metricUnit", message, alerted, checked_at AS "checkedAt"
         FROM monitoring_ledger
         WHERE service_name = $1
         ORDER BY checked_at DESC
         OFFSET 1 LIMIT 1;`,
        [serviceName]
      );
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          ...row,
          metricValue: row.metricValue !== null ? parseFloat(row.metricValue) : null,
          checkedAt: new Date(row.checkedAt).toISOString(),
        };
      }
      return null;
    } catch (err) {
      console.warn('[ObsSuite DB] Error getting previous check result:', err);
    }
  }

  const matches = memoryStore.ledger.filter((r) => r.serviceName === serviceName);
  return matches.length > 1 ? matches[1] : null;
}

/**
 * Queries current status for each monitored service (DISTINCT ON service_name).
 */
export async function getLatestStatusPerService(): Promise<LedgerRow[]> {
  await initDatabase();
  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      const res = await pool.query(`
        SELECT DISTINCT ON (service_name)
          id, check_type AS "checkType", service_name AS "serviceName", status, metric_value AS "metricValue", metric_unit AS "metricUnit", message, alerted, checked_at AS "checkedAt"
        FROM monitoring_ledger
        ORDER BY service_name, checked_at DESC;
      `);
      return res.rows.map((row) => ({
        ...row,
        metricValue: row.metricValue !== null ? parseFloat(row.metricValue) : null,
        checkedAt: new Date(row.checkedAt).toISOString(),
      }));
    } catch (err) {
      console.warn('[ObsSuite DB] Error querying latest status per service:', err);
    }
  }

  // Memory fallback
  const map = new Map<string, LedgerRow>();
  for (const row of memoryStore.ledger) {
    if (!map.has(row.serviceName)) {
      map.set(row.serviceName, row);
    }
  }
  return Array.from(map.values());
}

/**
 * Queries sparkline history points (worst severity per tick in recent window).
 */
export async function getSparklineHistory(limit = 60): Promise<{ checkedAt: string; severity: number; status: 'healthy' | 'degraded' | 'critical' }[]> {
  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      const res = await pool.query(`
        SELECT checked_at AS "checkedAt",
          MAX(CASE status WHEN 'critical' THEN 2 WHEN 'degraded' THEN 1 ELSE 0 END) AS severity
        FROM monitoring_ledger
        WHERE checked_at > NOW() - INTERVAL '24 hours'
        GROUP BY checked_at
        ORDER BY checked_at DESC
        LIMIT $1;
      `, [limit]);

      return res.rows.reverse().map((r) => {
        const sev = parseInt(r.severity, 10);
        return {
          checkedAt: new Date(r.checkedAt).toISOString(),
          severity: sev,
          status: sev === 2 ? 'critical' : sev === 1 ? 'degraded' : 'healthy',
        };
      });
    } catch (err) {
      console.warn('[ObsSuite DB] Error querying sparkline history:', err);
    }
  }

  // Memory fallback
  const grouped = new Map<string, number>();
  for (const r of memoryStore.ledger) {
    const timeKey = r.checkedAt;
    const sev = r.status === 'critical' ? 2 : r.status === 'degraded' ? 1 : 0;
    const currentMax = grouped.get(timeKey) || 0;
    if (sev > currentMax) grouped.set(timeKey, sev);
  }

  const result = Array.from(grouped.entries())
    .slice(0, limit)
    .reverse()
    .map(([checkedAt, severity]) => ({
      checkedAt,
      severity,
      status: (severity === 2 ? 'critical' : severity === 1 ? 'degraded' : 'healthy') as 'healthy' | 'degraded' | 'critical',
    }));

  return result;
}

/**
 * Queries historical alerts logged with alerted = true.
 */
export async function getAlertFeed(limit = 20): Promise<LedgerRow[]> {
  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      const res = await pool.query(`
        SELECT id, check_type AS "checkType", service_name AS "serviceName", status, metric_value AS "metricValue", metric_unit AS "metricUnit", message, alerted, checked_at AS "checkedAt"
        FROM monitoring_ledger
        WHERE alerted = true
        ORDER BY checked_at DESC
        LIMIT $1;
      `, [limit]);
      return res.rows.map((row) => ({
        ...row,
        metricValue: row.metricValue !== null ? parseFloat(row.metricValue) : null,
        checkedAt: new Date(row.checkedAt).toISOString(),
      }));
    } catch (err) {
      console.warn('[ObsSuite DB] Error querying alert feed:', err);
    }
  }

  return memoryStore.ledger.filter((r) => r.alerted).slice(0, limit);
}

/**
 * Computes Month-To-Date total LLM spend across all providers.
 */
export async function getMonthToDateLlmSpend(): Promise<{ totalSpendUsd: number; providerBreakdown: Record<string, number> }> {
  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      // Sum from llm_usage_events table first (§2.6)
      const resEvents = await pool.query(`
        SELECT provider, SUM(cost_usd) AS total_cost
        FROM llm_usage_events
        WHERE created_at >= DATE_TRUNC('month', NOW())
        GROUP BY provider;
      `);

      let totalSpend = 0;
      const breakdown: Record<string, number> = {};

      if (resEvents.rows.length > 0) {
        for (const row of resEvents.rows) {
          const cost = parseFloat(row.total_cost || '0');
          breakdown[row.provider] = cost;
          totalSpend += cost;
        }
        return { totalSpendUsd: totalSpend, providerBreakdown: breakdown };
      }

      // Fallback: sum from monitoring_ledger check_type = 'llm_credit'
      const resLedger = await pool.query(`
        SELECT service_name, SUM(metric_value) AS total_spend
        FROM monitoring_ledger
        WHERE check_type = 'llm_credit' AND checked_at >= DATE_TRUNC('month', NOW())
        GROUP BY service_name;
      `);

      for (const row of resLedger.rows) {
        const cost = parseFloat(row.total_spend || '0');
        breakdown[row.service_name] = cost;
        totalSpend += cost;
      }
      return { totalSpendUsd: totalSpend, providerBreakdown: breakdown };
    } catch (err) {
      console.warn('[ObsSuite DB] Error querying MTD spend from Postgres:', err);
    }
  }

  // Memory store calculation
  let totalSpend = 0;
  const breakdown: Record<string, number> = {};
  for (const evt of memoryStore.llmEvents) {
    breakdown[evt.provider] = (breakdown[evt.provider] || 0) + evt.costUsd;
    totalSpend += evt.costUsd;
  }

  if (totalSpend === 0) {
    for (const r of memoryStore.ledger) {
      if (r.checkType === 'llm_credit' && r.metricValue) {
        breakdown[r.serviceName] = (breakdown[r.serviceName] || 0) + r.metricValue;
        totalSpend += r.metricValue;
      }
    }
  }

  return { totalSpendUsd: totalSpend, providerBreakdown: breakdown };
}

/**
 * Records an agent LLM usage event (§2.6 extension).
 */
export async function logLlmUsageEvent(event: Omit<LlmUsageEvent, 'id' | 'createdAt'>): Promise<LlmUsageEvent> {
  await initDatabase();
  const pgUrl = getPgUrl();
  if (pgUrl) {
    try {
      const res = await pool.query(
        `INSERT INTO llm_usage_events (provider, task_id, input_tokens, output_tokens, cost_usd, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, provider, task_id AS "taskId", input_tokens AS "inputTokens", output_tokens AS "outputTokens", cost_usd AS "costUsd", created_at AS "createdAt";`,
        [event.provider, event.taskId || null, event.inputTokens, event.outputTokens, event.costUsd]
      );
      const row = res.rows[0];
      return {
        ...row,
        costUsd: parseFloat(row.costUsd),
        createdAt: new Date(row.createdAt).toISOString(),
      };
    } catch (err) {
      console.warn('[ObsSuite DB] Error logging LLM usage event to Postgres:', err);
    }
  }

  const newEvt: LlmUsageEvent = {
    id: memoryStore.nextEventId++,
    ...event,
    createdAt: new Date().toISOString(),
  };
  memoryStore.llmEvents.unshift(newEvt);
  return newEvt;
}

/**
 * Performs database health read/write probe operation.
 */
export async function probeDatabaseHealth(): Promise<{ latencyMs: number; error: string | null }> {
  const start = Date.now();
  const pgUrl = getPgUrl();
  if (!pgUrl) {
    // Memory probe simulation
    await new Promise((res) => setTimeout(res, 5 + Math.floor(Math.random() * 15)));
    return { latencyMs: Date.now() - start, error: null };
  }

  try {
    const client = await pool.connect();
    try {
      // 1. Connection ping
      await client.query('SELECT 1');
      // 2. Read/Write update probe against dedicated health_probe row (§2.3)
      const probeVal = `probe_tick_${Date.now()}`;
      await client.query('UPDATE health_probe SET probe_value = $1, updated_at = NOW() WHERE id = 1', [probeVal]);
      await client.query('SELECT probe_value FROM health_probe WHERE id = 1');

      const latencyMs = Date.now() - start;
      return { latencyMs, error: null };
    } finally {
      client.release();
    }
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
