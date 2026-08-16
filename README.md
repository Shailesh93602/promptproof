# promptproof

> Catch LLM regressions before your users do.

You change a prompt to fix one thing. Three other things quietly break. You find out from a customer. **promptproof** is the small, boring tool that stops that: define eval cases, grade outputs, save a baseline, and on every change get a straight answer to _"did this make things worse?"_ — as a list of regressions, not a vibe.

- **Zero runtime dependencies.** One small library + a CLI. Reads in 15 minutes.
- **Runs offline in CI.** No API key needed to test the harness itself — bring your own model behind one function.
- **Regression diffing is the point.** Save a baseline run, compare new runs, fail the build on any `pass → fail`.
- **Graders included:** exact, includes, regex (with negate), JSON-shape, and an offline token-overlap grader. Bring your own in one function.
- **TypeScript, ESM, fully typed.**

---

## Install

```bash
npm install github:Shailesh93602/promptproof
```

> Not on npm yet — install from the repo. It builds itself on install
> (`prepare`), and imports as `promptproof`.

## 60-second example

```ts
import {
  runSuite,
  includes,
  jsonShape,
  matches,
  type Suite,
} from "promptproof";

const suite: Suite = {
  name: "support-assistant",
  cases: [
    {
      id: "refund-window",
      input: "What is the refund window?",
      expected: "Refunds are allowed within 30 days.",
      graders: [includes(["30 days", "refund"])],
    },
    {
      id: "structured-output",
      input: "Return order status as JSON for order 123",
      graders: [
        jsonShape({ orderId: "string", status: "string", eta: "number" }),
      ],
    },
    {
      id: "no-hallucinated-phone",
      input: "What's your support number?",
      graders: [matches(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, { negate: true })],
    },
  ],
};

// Plug in your model. Anything that takes a string and returns a string.
const runner = async (input: string) => callYourLLM(input);

const result = await runSuite(suite, runner);
console.log(`${result.passed}/${result.total} passed · score ${result.score}`);
```

## The workflow that matters: baseline → compare

```ts
import {
  runSuite,
  compareRuns,
  hasRegressions,
  saveRun,
  loadRun,
} from "promptproof";

// Once, on a known-good prompt:
saveRun("baseline.json", await runSuite(suite, runner));

// Later, after you change the prompt:
const current = await runSuite(suite, runner);
const cmp = compareRuns(loadRun("baseline.json"), current);

if (hasRegressions(cmp)) {
  console.error(cmp.regressions); // exactly which cases went pass → fail
  process.exit(1);
}
```

## CLI

A suite module exports `{ suite, runner }`. The CLI `import`s it with plain
Node, so point at ESM JavaScript — `./evals/suite.mjs`, or `.js` in a
`"type": "module"` package:

```bash
# save a baseline
npx promptproof run ./evals/suite.mjs --save baseline.json

# later — compare against it; exits 1 if anything regressed (CI gate)
npx promptproof run ./evals/suite.mjs --baseline baseline.json

# diff two saved runs
npx promptproof compare baseline.json current.json
```

**Writing the suite in TypeScript?** Node can't `import` a `.ts` file on its own
before v22.6, so run the CLI under a loader (the CLI tells you this if you try):

```bash
npx tsx node_modules/promptproof/dist/cli/main.js run ./evals/suite.ts --baseline baseline.json
```

Sample output:

```
Suite: support-assistant
Score 100.0% → 86.8%  ▼ 13.2%
Regressions 1  ·  improvements 0  ·  unchanged 4

REGRESSIONS (pass → fail):
  ✗ refund-window  100.0% → 34.1%
```

## In CI (GitHub Actions)

```yaml
# .github/workflows/eval.yml
name: prompt eval
on: [pull_request]
jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      # baseline.json is committed; the gate fails the PR on any regression
      - run: npx promptproof run ./evals/suite.mjs --baseline baseline.json
```

## Graders

| Grader                    | Passes when                                     | Notes                                    |
| ------------------------- | ----------------------------------------------- | ---------------------------------------- |
| `exact(opts)`             | output equals `expected`                        | `ignoreCase`, `trim`                     |
| `includes(needles, opts)` | required substring(s) present                   | `all`/`any` mode, partial-credit score   |
| `matches(pattern, opts)`  | regex matches (or doesn't, with `negate`)       | format & "must-not-contain" checks       |
| `jsonShape(shape, opts)`  | output parses as JSON with the right keys/types | catches structured-output drift          |
| `overlap(opts)`           | token-F1 vs `expected` clears a threshold       | offline stand-in for semantic similarity |

A grader is just `{ name, grade(output, ctx) → { score, pass, reason } }`. Write your own — call an embedding model, an LLM judge, a domain rule — and drop it in the `graders` array.

### Why an offline overlap grader instead of embeddings?

So the harness runs in CI with no API key and no flakiness. Token-F1 is an honest "good enough" default for catching gross regressions. When you need true semantic scoring, write a one-function custom grader that calls your embedding model — the design expects it.

## Design notes

- **Deterministic.** Same suite + same runner → identical results, which is what makes diffing meaningful. Timestamps are injected, never read from the clock.
- **Errors are per-case.** A runner that throws marks that case failed with the message — one bad call doesn't sink the run.
- **Weights.** Cases can carry a `weight` for the aggregate score when some matter more.
- **Bounded concurrency.** Cases run a few at a time; order is preserved.

## License

MIT
