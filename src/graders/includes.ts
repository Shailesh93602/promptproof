import type { Grader, GradeContext, GradeResult } from "../types.js";

export interface IncludesOptions {
  ignoreCase?: boolean;
  /**
   * How to combine multiple required substrings.
   * "all" (default): every substring must appear.
   * "any": at least one must appear.
   */
  mode?: "all" | "any";
}

/**
 * Passes if the output contains the required substring(s). The everyday grader
 * for "did the answer mention X" without demanding an exact match. With multiple
 * substrings in "all" mode, the score is the fraction present (partial credit).
 */
export function includes(
  required: string | string[],
  opts: IncludesOptions = {},
): Grader {
  const ignoreCase = opts.ignoreCase ?? true;
  const mode = opts.mode ?? "all";
  const needles = Array.isArray(required) ? required : [required];

  return {
    name: "includes",
    grade(output: string): GradeResult {
      if (needles.length === 0) {
        return { score: 1, pass: true, reason: "no substrings required" };
      }
      const hay = ignoreCase ? output.toLowerCase() : output;
      const present = needles.filter((n) =>
        hay.includes(ignoreCase ? n.toLowerCase() : n),
      );
      const missing = needles.filter((n) => !present.includes(n));

      const pass = mode === "any" ? present.length > 0 : missing.length === 0;
      const score =
        mode === "any"
          ? present.length > 0
            ? 1
            : 0
          : present.length / needles.length;

      return {
        score,
        pass,
        reason: pass
          ? `found ${mode === "any" ? "a required substring" : "all required substrings"}`
          : `missing: ${missing.map((m) => JSON.stringify(m)).join(", ")}`,
      };
    },
  };
}
