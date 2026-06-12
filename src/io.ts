import { readFileSync, writeFileSync } from "node:fs";
import type { RunResult } from "./types.js";

/** Persist a run result as pretty JSON — this is your baseline file. */
export function saveRun(path: string, run: RunResult): void {
  writeFileSync(path, JSON.stringify(run, null, 2) + "\n", "utf8");
}

/** Load a previously saved run result (for comparison). */
export function loadRun(path: string): RunResult {
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as RunResult;
  if (!parsed || !Array.isArray(parsed.cases)) {
    throw new Error(`${path} does not look like a promptproof run result`);
  }
  return parsed;
}
