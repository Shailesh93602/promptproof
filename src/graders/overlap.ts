import type { Grader, GradeContext, GradeResult } from "../types.js";

export interface OverlapOptions {
  /** Pass threshold on the token-F1 score, in [0, 1]. Default 0.5. */
  threshold?: number;
  /** Drop common English stopwords before comparing. Default true. */
  stripStopwords?: boolean;
}

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "to",
  "of",
  "in",
  "on",
  "for",
  "and",
  "or",
  "but",
  "if",
  "then",
  "so",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "with",
  "as",
  "at",
  "by",
  "from",
  "into",
  "about",
  "you",
  "your",
  "i",
  "we",
  "they",
  "he",
  "she",
  "do",
  "does",
  "did",
  "have",
  "has",
  "had",
  "will",
  "would",
  "can",
  "could",
]);

function tokenize(s: string, strip: boolean): string[] {
  const toks = s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return strip ? toks.filter((t) => !STOPWORDS.has(t)) : toks;
}

/**
 * A dependency-free, offline stand-in for semantic similarity: token-level F1
 * between the output and `expected`. It rewards covering the expected content
 * words without demanding exact wording, and runs with no API key — so it works
 * in CI. For true semantic scoring, write a custom grader that calls an
 * embedding model; this is the honest "good enough offline" default.
 */
export function overlap(opts: OverlapOptions = {}): Grader {
  const threshold = opts.threshold ?? 0.5;
  const strip = opts.stripStopwords ?? true;

  return {
    name: "overlap",
    grade(output: string, ctx: GradeContext): GradeResult {
      if (ctx.expected === undefined) {
        return {
          score: 0,
          pass: false,
          reason: "overlap grader needs `expected` but none was provided",
        };
      }
      const out = tokenize(output, strip);
      const exp = tokenize(ctx.expected, strip);
      if (exp.length === 0 && out.length === 0) {
        return { score: 1, pass: true, reason: "both empty" };
      }
      const outSet = new Set(out);
      const expSet = new Set(exp);
      let overlapCount = 0;
      for (const t of expSet) if (outSet.has(t)) overlapCount++;

      const precision = outSet.size ? overlapCount / outSet.size : 0;
      const recall = expSet.size ? overlapCount / expSet.size : 0;
      const f1 =
        precision + recall === 0
          ? 0
          : (2 * precision * recall) / (precision + recall);
      const score = Number(f1.toFixed(4));
      const pass = score >= threshold;

      return {
        score,
        pass,
        reason: `token-F1 ${score} (precision ${precision.toFixed(2)}, recall ${recall.toFixed(2)}) vs threshold ${threshold}`,
      };
    },
  };
}
