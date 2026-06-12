/**
 * Core types for promptproof.
 *
 * The model is intentionally tiny: a Suite is a list of Cases, each Case has an
 * input, an optional expected value, and one or more Graders. A Grader looks at
 * the model's output (plus the case) and returns a score in [0, 1] with a pass
 * flag. Everything else (running, scoring, regression diffing) builds on this.
 */

/** A grader's verdict on a single output. */
export interface GradeResult {
  /** Score in [0, 1]. 1 = perfect, 0 = total miss. */
  score: number;
  /** Did this grader consider the output acceptable? */
  pass: boolean;
  /** Human-readable reason, shown in reports when a case fails. */
  reason: string;
  /** Grader name, filled in by the runner if the grader omits it. */
  grader?: string;
}

/** A grader scores an output against a case. Pure and synchronous by design. */
export interface Grader {
  /** Stable identifier, shown in reports (e.g. "exact", "includes"). */
  readonly name: string;
  grade(output: string, ctx: GradeContext): GradeResult;
}

/** What a grader is given besides the raw output. */
export interface GradeContext {
  input: string;
  expected?: string;
  /** Free-form metadata from the case (tags, ids, anything). */
  meta?: Record<string, unknown>;
}

/** One evaluation case. */
export interface Case {
  /** Unique within a suite. Used to match cases across runs for diffing. */
  id: string;
  input: string;
  expected?: string;
  graders: Grader[];
  /** Weight for the suite's aggregate score (default 1). */
  weight?: number;
  meta?: Record<string, unknown>;
}

/** A named collection of cases. */
export interface Suite {
  name: string;
  cases: Case[];
}

/**
 * Produces an output for a given input. You supply this — wrap your real LLM
 * call here, or use a deterministic offline runner for tests/CI.
 */
export type ModelRunner = (input: string) => Promise<string> | string;

/** Result of grading a single case. */
export interface CaseResult {
  id: string;
  input: string;
  expected?: string;
  output: string;
  /** Every grader's verdict for this case. */
  grades: GradeResult[];
  /** Mean grader score in [0, 1]. */
  score: number;
  /** True only if EVERY grader passed. */
  pass: boolean;
  weight: number;
  /** Error message if the runner threw for this case. */
  error?: string;
}

/** Result of running a whole suite. */
export interface RunResult {
  suite: string;
  /** ISO timestamp; injected by the caller so runs stay deterministic in tests. */
  timestamp?: string;
  cases: CaseResult[];
  /** Number of cases where every grader passed. */
  passed: number;
  /** Total number of cases. */
  total: number;
  /** Weighted mean score in [0, 1]. */
  score: number;
}
