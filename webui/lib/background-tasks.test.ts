import { beforeEach, expect, test } from "vitest";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

process.env.WEBUI_DB_PATH = join(mkdtempSync(join(tmpdir(), "immo-bg-")), "webui.db");
process.env.FREDY_DB_PATH = join(mkdtempSync(join(tmpdir(), "immo-fredy-")), "listings.db");

const { startTask, updateProgress, finishTask, failTask, latestTask, runningTask } = await import(
  "./background-tasks"
);
const { appDb } = await import("./db");

beforeEach(() => {
  appDb().prepare("DELETE FROM background_tasks").run();
});

test("a started task is running and is found as the latest one", () => {
  const task = startTask("availability");
  expect(task.state).toBe("running");
  expect(runningTask("availability")?.id).toBe(task.id);
  expect(latestTask("availability")?.id).toBe(task.id);
});

test("progress is stored", () => {
  const task = startTask("availability");
  updateProgress(task.id, 12, 40);
  expect(latestTask("availability")?.done).toBe(12);
  expect(latestTask("availability")?.total).toBe(40);
});

test("a finished task is no longer running and keeps its result", () => {
  const task = startTask("availability");
  finishTask(task.id, { checked: 5, gone: 1 });
  expect(runningTask("availability")).toBeNull();
  expect(JSON.parse(latestTask("availability")!.result!)).toEqual({ checked: 5, gone: 1 });
});

test("a failed task records its error", () => {
  const task = startTask("scrape");
  failTask(task.id, "boom");
  expect(latestTask("scrape")?.state).toBe("error");
  expect(latestTask("scrape")?.error).toBe("boom");
});
