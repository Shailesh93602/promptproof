/**
 * promptproof — catch LLM regressions before your users do.
 *
 * Public API. Define a Suite of Cases with graders, run it against your model
 * (or an offline fixture), save the result as a baseline, then compare future
 * runs to surface regressions.
 */

export type {
  Case,
  CaseResult,
  GradeContext,
  GradeResult,
  Grader,
  ModelRunner,
  RunResult,
  Suite,
} from "./types.js";

export {
  exact,
  includes,
  matches,
  overlap,
  jsonShape,
  type ExactOptions,
  type IncludesOptions,
  type RegexOptions,
  type OverlapOptions,
  type Shape,
  type JsonShapeOptions,
} from "./graders/index.js";

export { runSuite, type RunOptions } from "./core/run.js";
export {
  compareRuns,
  hasRegressions,
  type Comparison,
  type CaseDelta,
} from "./core/compare.js";
export { formatRun, formatComparison } from "./core/report.js";
export { fixtureRunner, liveRunner } from "./runners/offline.js";
export { saveRun, loadRun } from "./io.js";
