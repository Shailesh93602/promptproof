import type { RunResult } from "../types.js";
import type { Comparison } from "./compare.js";

const pct = (n: number): string => `${(n * 100).toFixed(1)}%`;

/** A compact, human-readable summary of a single run. */
export function formatRun(run: RunResult): string {
  const lines: string[] = [];
  lines.push(`Suite: ${run.suite}`);
  lines.push(
    `Passed ${run.passed}/${run.total}  ·  score ${pct(run.score)}` +
      (run.timestamp ? `  ·  ${run.timestamp}` : ""),
  );
  const failures = run.cases.filter((c) => !c.pass);
  if (failures.length) {
    lines.push("");
    lines.push("Failures:");
    for (const c of failures) {
      lines.push(`  ✗ ${c.id}  (score ${pct(c.score)})`);
      if (c.error) {
        lines.push(`      runner error: ${c.error}`);
        continue;
      }
      for (const g of c.grades.filter((g) => !g.pass)) {
        lines.push(`      [${g.grader}] ${g.reason}`);
      }
    }
  }
  return lines.join("\n");
}

/** A human-readable diff of a current run against a baseline. */
export function formatComparison(cmp: Comparison): string {
  const arrow = cmp.scoreDelta >= 0 ? "▲" : "▼";
  const lines: string[] = [];
  lines.push(`Suite: ${cmp.suite}`);
  lines.push(
    `Score ${pct(cmp.baselineScore)} → ${pct(cmp.currentScore)}  ${arrow} ${pct(Math.abs(cmp.scoreDelta))}`,
  );
  lines.push(
    `Regressions ${cmp.regressions.length}  ·  improvements ${cmp.improvements.length}  ·  unchanged ${cmp.unchanged.length}`,
  );

  if (cmp.regressions.length) {
    lines.push("");
    lines.push("REGRESSIONS (pass → fail):");
    for (const r of cmp.regressions) {
      lines.push(
        `  ✗ ${r.id}  ${pct(r.baselineScore)} → ${pct(r.currentScore)}`,
      );
    }
  }
  if (cmp.improvements.length) {
    lines.push("");
    lines.push("Improvements (fail → pass):");
    for (const r of cmp.improvements) {
      lines.push(
        `  ✓ ${r.id}  ${pct(r.baselineScore)} → ${pct(r.currentScore)}`,
      );
    }
  }
  if (cmp.added.length) lines.push(`\nAdded: ${cmp.added.join(", ")}`);
  if (cmp.removed.length) lines.push(`Removed: ${cmp.removed.join(", ")}`);

  return lines.join("\n");
}
