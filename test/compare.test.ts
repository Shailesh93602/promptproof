import { describe, it, expect } from "vitest";
import {
  runSuite,
  compareRuns,
  hasRegressions,
  exact,
  type Suite,
} from "../src/index.js";
import { fixtureRunner } from "../src/runners/offline.js";

const suite: Suite = {
  name: "s",
  cases: [
    { id: "a", input: "a", expected: "A", graders: [exact()] },
    { id: "b", input: "b", expected: "B", graders: [exact()] },
    { id: "c", input: "c", expected: "C", graders: [exact()] },
  ],
};

describe("compareRuns", () => {
  it("flags a pass→fail as a regression and fail→pass as improvement", async () => {
    const baseline = await runSuite(
      suite,
      fixtureRunner({ a: "A", b: "WRONG", c: "C" }),
    );
    // prompt change: 'b' now correct, but 'a' broke
    const current = await runSuite(
      suite,
      fixtureRunner({ a: "WRONG", b: "B", c: "C" }),
    );

    const cmp = compareRuns(baseline, current);
    expect(cmp.regressions.map((r) => r.id)).toEqual(["a"]);
    expect(cmp.improvements.map((r) => r.id)).toEqual(["b"]);
    expect(cmp.unchanged.map((r) => r.id)).toEqual(["c"]);
    expect(hasRegressions(cmp)).toBe(true);
  });

  it("reports no regressions when everything holds or improves", async () => {
    const baseline = await runSuite(
      suite,
      fixtureRunner({ a: "A", b: "WRONG", c: "C" }),
    );
    const current = await runSuite(
      suite,
      fixtureRunner({ a: "A", b: "B", c: "C" }),
    );
    const cmp = compareRuns(baseline, current);
    expect(hasRegressions(cmp)).toBe(false);
    expect(cmp.scoreDelta).toBeGreaterThan(0);
  });

  it("tracks added and removed cases", async () => {
    const baseline = await runSuite(
      suite,
      fixtureRunner({ a: "A", b: "B", c: "C" }),
    );
    const smaller: Suite = {
      name: "s",
      cases: [
        suite.cases[0]!,
        { id: "d", input: "d", expected: "D", graders: [exact()] },
      ],
    };
    const current = await runSuite(smaller, fixtureRunner({ a: "A", d: "D" }));
    const cmp = compareRuns(baseline, current);
    expect(cmp.added).toEqual(["d"]);
    expect(cmp.removed.sort()).toEqual(["b", "c"]);
  });
});
