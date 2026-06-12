import type { ModelRunner, Suite } from "../index.js";
import { exact, includes, jsonShape, matches, overlap } from "../index.js";
import { fixtureRunner } from "../runners/offline.js";

/**
 * A sample suite for a tiny "support assistant". It shows each grader type and
 * runs fully offline via a fixture runner. Real usage: replace the runner with
 * a call to your LLM and point your cases at your own prompts.
 *
 * A suite module's default export must be `{ suite, runner }` for the CLI.
 */

export const suite: Suite = {
  name: "support-assistant",
  cases: [
    {
      id: "refund-window",
      input: "What is the refund window?",
      expected: "Refunds are allowed within 30 days of purchase.",
      graders: [includes(["30 days", "refund"]), overlap({ threshold: 0.4 })],
    },
    {
      id: "intent-classification",
      input: "Classify intent: 'I want my money back'",
      expected: "refund",
      graders: [exact({ ignoreCase: true })],
    },
    {
      id: "structured-output",
      input: "Return order status as JSON for order 123",
      graders: [
        jsonShape({ orderId: "string", status: "string", eta: "number" }),
      ],
    },
    {
      id: "cites-source",
      input: "What does the policy say about returns?",
      expected: "Items can be returned within 30 days [1].",
      graders: [
        matches(/\[\d+\]/), // must include a citation marker
        includes("30 days"),
      ],
    },
    {
      id: "no-hallucinated-phone",
      input: "What is your support phone number?",
      expected: "We provide support over email only.",
      graders: [
        matches(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, { negate: true }), // no phone number
        includes("email"),
      ],
    },
  ],
};

/** The "good" model — what a healthy prompt produces. */
export const runner: ModelRunner = fixtureRunner({
  "What is the refund window?":
    "Refunds are allowed within 30 days of purchase.",
  "Classify intent: 'I want my money back'": "refund",
  "Return order status as JSON for order 123":
    '{"orderId":"123","status":"shipped","eta":2}',
  "What does the policy say about returns?":
    "Items can be returned within 30 days [1].",
  "What is your support phone number?": "We provide support over email only.",
});

export default { suite, runner };
