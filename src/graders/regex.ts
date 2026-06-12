import type { Grader, GradeContext, GradeResult } from "../types.js";

export interface RegexOptions {
  /**
   * If true, the pattern must NOT match for the case to pass. Useful as a guard
   * ("the answer must not contain a phone number / an apology / a refusal").
   */
  negate?: boolean;
}

/**
 * Passes if the output matches the given pattern (or, with `negate`, does not).
 * Good for format checks: "looks like JSON", "contains a citation [n]", "no PII".
 */
export function matches(
  pattern: RegExp | string,
  opts: RegexOptions = {},
): Grader {
  const re = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  const negate = opts.negate ?? false;

  return {
    name: negate ? "regex(negated)" : "regex",
    grade(output: string): GradeResult {
      const hit = re.test(output);
      const pass = negate ? !hit : hit;
      return {
        score: pass ? 1 : 0,
        pass,
        reason: pass
          ? negate
            ? `pattern ${re} correctly did not match`
            : `pattern ${re} matched`
          : negate
            ? `pattern ${re} matched but should not have`
            : `pattern ${re} did not match`,
      };
    },
  };
}
