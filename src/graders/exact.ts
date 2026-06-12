import type { Grader, GradeContext, GradeResult } from "../types.js";

export interface ExactOptions {
  /** Compare case-insensitively. Default false. */
  ignoreCase?: boolean;
  /** Trim surrounding whitespace before comparing. Default true. */
  trim?: boolean;
}

/**
 * Passes only if the output equals `expected` exactly (after the configured
 * normalization). The strictest grader — use for deterministic outputs like
 * classifications, slugs, or enum values.
 */
export function exact(opts: ExactOptions = {}): Grader {
  const ignoreCase = opts.ignoreCase ?? false;
  const trim = opts.trim ?? true;

  const norm = (s: string): string => {
    let v = trim ? s.trim() : s;
    if (ignoreCase) v = v.toLowerCase();
    return v;
  };

  return {
    name: "exact",
    grade(output: string, ctx: GradeContext): GradeResult {
      if (ctx.expected === undefined) {
        return {
          score: 0,
          pass: false,
          reason: "exact grader needs `expected` but none was provided",
        };
      }
      const pass = norm(output) === norm(ctx.expected);
      return {
        score: pass ? 1 : 0,
        pass,
        reason: pass
          ? "output matched expected exactly"
          : `expected ${JSON.stringify(ctx.expected)}, got ${JSON.stringify(output)}`,
      };
    },
  };
}
