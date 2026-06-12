import type {
  Case,
  CaseResult,
  GradeResult,
  ModelRunner,
  RunResult,
  Suite,
} from "../types.js";

export interface RunOptions {
  /** Max cases evaluated concurrently. Default 4. */
  concurrency?: number;
  /** ISO timestamp to stamp on the result. Omit to leave it unset (deterministic). */
  timestamp?: string;
  /** Called after each case finishes — handy for progress output. */
  onCase?: (result: CaseResult) => void;
}

function gradeCase(caseDef: Case, output: string): GradeResult[] {
  return caseDef.graders.map((g) => {
    const r = g.grade(output, {
      input: caseDef.input,
      expected: caseDef.expected,
      meta: caseDef.meta,
    });
    return { ...r, grader: r.grader ?? g.name };
  });
}

async function evaluateCase(
  caseDef: Case,
  runner: ModelRunner,
): Promise<CaseResult> {
  const weight = caseDef.weight ?? 1;
  let output = "";
  try {
    output = await runner(caseDef.input);
  } catch (err) {
    return {
      id: caseDef.id,
      input: caseDef.input,
      expected: caseDef.expected,
      output: "",
      grades: [],
      score: 0,
      pass: false,
      weight,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const grades = gradeCase(caseDef, output);
  const score = grades.length
    ? grades.reduce((s, g) => s + g.score, 0) / grades.length
    : 0;
  const pass = grades.length > 0 && grades.every((g) => g.pass);

  return {
    id: caseDef.id,
    input: caseDef.input,
    expected: caseDef.expected,
    output,
    grades,
    score: Number(score.toFixed(4)),
    pass,
    weight,
  };
}

/**
 * Run a suite against a model runner, grading every case. Cases run with bounded
 * concurrency; results preserve suite order. Pure aside from calling the runner,
 * so the same suite + a deterministic runner gives identical results — which is
 * exactly what makes regression diffing meaningful.
 */
export async function runSuite(
  suite: Suite,
  runner: ModelRunner,
  opts: RunOptions = {},
): Promise<RunResult> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const results: CaseResult[] = new Array(suite.cases.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = next++;
      if (i >= suite.cases.length) return;
      const result = await evaluateCase(suite.cases[i]!, runner);
      results[i] = result;
      opts.onCase?.(result);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, suite.cases.length) },
    () => worker(),
  );
  await Promise.all(workers);

  const totalWeight = results.reduce((s, r) => s + r.weight, 0);
  const weightedScore = totalWeight
    ? results.reduce((s, r) => s + r.score * r.weight, 0) / totalWeight
    : 0;
  const passed = results.filter((r) => r.pass).length;

  return {
    suite: suite.name,
    timestamp: opts.timestamp,
    cases: results,
    passed,
    total: results.length,
    score: Number(weightedScore.toFixed(4)),
  };
}
