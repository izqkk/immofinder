// Tracking for long-running background work (kicking off a scrape, the availability
// run). The state lives in webui.db so that progress survives page changes and reloads,
// and so a single poll endpoint can serve all of it.

import { appDb, fredyDb } from "./db";

export type TaskKind = "scrape" | "availability" | "geocode";
export type TaskState = "running" | "done" | "error";

export type TaskRow = {
  id: number;
  kind: TaskKind;
  state: TaskState;
  startedAt: number;
  endedAt: number | null;
  done: number;
  total: number;
  result: string | null;
  error: string | null;
};

type DbRow = {
  id: number;
  kind: TaskKind;
  state: TaskState;
  started_at: number;
  ended_at: number | null;
  done: number;
  total: number;
  result: string | null;
  error: string | null;
};

function toTask(row: DbRow): TaskRow {
  return {
    id: row.id,
    kind: row.kind,
    state: row.state,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    done: row.done,
    total: row.total,
    result: row.result,
    error: row.error,
  };
}

function byId(id: number): TaskRow {
  const row = appDb()
    .prepare(`SELECT * FROM background_tasks WHERE id = ?`)
    .get(id) as DbRow | undefined;
  if (!row) throw new Error(`Background task ${id} not found`);
  return toTask(row);
}

/** Creates a new task in the 'running' state. */
export function startTask(kind: TaskKind): TaskRow {
  const info = appDb()
    .prepare(
      `INSERT INTO background_tasks(kind, state, started_at, done, total)
       VALUES (?, 'running', ?, 0, 0)`,
    )
    .run(kind, Date.now());
  return byId(Number(info.lastInsertRowid));
}

/** Records the progress of a running task. */
export function updateProgress(id: number, done: number, total: number): void {
  appDb()
    .prepare(`UPDATE background_tasks SET done = ?, total = ? WHERE id = ?`)
    .run(Math.max(0, Math.floor(done)), Math.max(0, Math.floor(total)), id);
}

/** Completes a task successfully; the result is stored as JSON. */
export function finishTask(id: number, result: unknown): void {
  appDb()
    .prepare(
      `UPDATE background_tasks SET state = 'done', ended_at = ?, result = ? WHERE id = ?`,
    )
    .run(Date.now(), JSON.stringify(result ?? null), id);
}

/** Aborts a task with an error. */
export function failTask(id: number, error: string): void {
  appDb()
    .prepare(`UPDATE background_tasks SET state = 'error', ended_at = ?, error = ? WHERE id = ?`)
    .run(Date.now(), String(error).slice(0, 2000), id);
}

/** Most recent task of this kind, regardless of its state. */
export function latestTask(kind: TaskKind): TaskRow | null {
  const row = appDb()
    .prepare(`SELECT * FROM background_tasks WHERE kind = ? ORDER BY started_at DESC, id DESC LIMIT 1`)
    .get(kind) as DbRow | undefined;
  return row ? toTask(row) : null;
}

/** Most recent task of this kind that is still running. */
export function runningTask(kind: TaskKind): TaskRow | null {
  const row = appDb()
    .prepare(
      `SELECT * FROM background_tasks WHERE kind = ? AND state = 'running'
       ORDER BY started_at DESC, id DESC LIMIT 1`,
    )
    .get(kind) as DbRow | undefined;
  return row ? toTask(row) : null;
}

/** Number of Fredy listings that have been imported since `ts`. */
export function countListingsSince(ts: number): number {
  const row = fredyDb()
    .prepare(`SELECT COUNT(*) AS n FROM listings WHERE created_at > ?`)
    .get(ts) as { n: number } | undefined;
  return row?.n ?? 0;
}
