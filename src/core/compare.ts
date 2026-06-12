import type { RunResult, CaseResult } from "../types.js";

export interface CaseDelta {
  id: string;
  baselineScore: number;
  currentScore: number;
  /** currentScore - baselineScore. */
  scoreDelta: number;
  baselinePass: boolean;
  currentPass: boolean;
}

export interface Comparison {
  suite: string;
  baselineScore: number;
  currentScore: number;
  scoreDelta: number;
  /** Cases that went pass -> fail. These are what break your build. */
  regressions: CaseDelta[];
  /** Cases that went fail -> pass. */
  improvements: CaseDelta[];
  /** Cases whose pass/fail didn't change. */
  unchanged: CaseDelta[];
  /** Case ids present in current but not baseline. */
  added: string[];
  /** Case ids present in baseline but not current. */
  removed: string[];
}

function index(run: RunResult): Map<string, CaseResult> {
  return new Map(run.cases.map((c) => [c.id, c]));
}

/**
 * Diff a current run against a baseline run, by case id. The headline output is
 * `regressions`: cases that used to pass and now fail. This is the whole point —
 * "did my prompt change make things worse?" answered as a list, not a vibe.
 */
export function compareRuns(
  baseline: RunResult,
  current: RunResult,
): Comparison {
  const base = index(baseline);
  const curr = index(current);

  const regressions: CaseDelta[] = [];
  const improvements: CaseDelta[] = [];
  const unchanged: CaseDelta[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [id, c] of curr) {
    const b = base.get(id);
    if (!b) {
      added.push(id);
      continue;
    }
    const delta: CaseDelta = {
      id,
      baselineScore: b.score,
      currentScore: c.score,
      scoreDelta: Number((c.score - b.score).toFixed(4)),
      baselinePass: b.pass,
      currentPass: c.pass,
    };
    if (b.pass && !c.pass) regressions.push(delta);
    else if (!b.pass && c.pass) improvements.push(delta);
    else unchanged.push(delta);
  }

  for (const id of base.keys()) {
    if (!curr.has(id)) removed.push(id);
  }

  return {
    suite: current.suite,
    baselineScore: baseline.score,
    currentScore: current.score,
    scoreDelta: Number((current.score - baseline.score).toFixed(4)),
    regressions,
    improvements,
    unchanged,
    added,
    removed,
  };
}

/** True if the comparison has any pass -> fail regressions. Use as a CI gate. */
export function hasRegressions(cmp: Comparison): boolean {
  return cmp.regressions.length > 0;
}
