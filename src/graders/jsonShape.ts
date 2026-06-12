import type { Grader, GradeContext, GradeResult } from "../types.js";

/** A minimal shape spec: maps a key to the JS `typeof` it must have. */
export type Shape = Record<
  string,
  "string" | "number" | "boolean" | "object" | "array"
>;

export interface JsonShapeOptions {
  /** Require every key in the shape (default true). */
  requireAll?: boolean;
}

function typeOf(v: unknown): string {
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/**
 * Parses the output as JSON and checks it has the expected keys with the
 * expected types. The reliability grader for "the model must return valid
 * structured output" — a top cause of production breakage when a prompt drifts.
 * Score is the fraction of shape keys satisfied; invalid JSON scores 0.
 */
export function jsonShape(shape: Shape, opts: JsonShapeOptions = {}): Grader {
  const requireAll = opts.requireAll ?? true;
  const keys = Object.keys(shape);

  return {
    name: "jsonShape",
    grade(output: string, _ctx: GradeContext): GradeResult {
      let parsed: unknown;
      try {
        parsed = JSON.parse(output);
      } catch {
        return { score: 0, pass: false, reason: "output is not valid JSON" };
      }
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        return {
          score: 0,
          pass: false,
          reason: "parsed JSON is not an object",
        };
      }
      const obj = parsed as Record<string, unknown>;
      const problems: string[] = [];
      let satisfied = 0;

      for (const key of keys) {
        if (!(key in obj)) {
          problems.push(`missing key "${key}"`);
          continue;
        }
        const want = shape[key];
        const got = typeOf(obj[key]);
        if (got === want) {
          satisfied++;
        } else {
          problems.push(`"${key}" should be ${want}, got ${got}`);
        }
      }

      const score = keys.length ? satisfied / keys.length : 1;
      const pass = requireAll ? problems.length === 0 : satisfied > 0;
      return {
        score: Number(score.toFixed(4)),
        pass,
        reason: pass ? "shape satisfied" : problems.join("; "),
      };
    },
  };
}
