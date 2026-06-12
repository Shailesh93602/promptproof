import type { ModelRunner } from "../types.js";

/**
 * A deterministic, no-network runner backed by a fixed input→output map. Use it
 * in tests and CI so the eval harness itself can be verified without an API key.
 * Unknown inputs return `fallback` (default empty string).
 */
export function fixtureRunner(
  table: Record<string, string>,
  fallback = "",
): ModelRunner {
  return (input: string) => table[input] ?? fallback;
}

/**
 * Wraps any async model call so it never throws into the runner loop's per-case
 * error handling unexpectedly — and optionally maps the prompt before sending.
 * This is the seam where you plug in OpenAI/Anthropic/etc.:
 *
 *   const runner = liveRunner((q) => openai.chat(...).then(r => r.text));
 */
export function liveRunner(
  call: (input: string) => Promise<string>,
): ModelRunner {
  return (input: string) => call(input);
}
