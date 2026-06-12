import { describe, it, expect } from "vitest";
import { runSuite, exact, includes, type Suite } from "../src/index.js";
import { fixtureRunner } from "../src/runners/offline.js";

const suite: Suite = {
  name: "t",
  cases: [
    { id: "a", input: "in-a", expected: "out-a", graders: [exact()] },
    { id: "b", input: "in-b", expected: "x", graders: [includes("x")] },
    { id: "c", input: "in-c", expected: "nope", graders: [exact()] },
  ],
};

describe("runSuite", () => {
  it("grades cases, preserves order, and aggregates", async () => {
    const runner = fixtureRunner({
      "in-a": "out-a",
      "in-b": "contains x indeed",
      "in-c": "wrong",
    });
    const res = await runSuite(suite, runner, { concurrency: 2 });

    expect(res.cases.map((c) => c.id)).toEqual(["a", "b", "c"]);
    expect(res.total).toBe(3);
    expect(res.passed).toBe(2);
    expect(res.cases[2]!.pass).toBe(false);
    expect(res.score).toBeCloseTo(2 / 3, 2);
  });

  it("captures runner errors per-case instead of throwing", async () => {
    const runner = () => {
      throw new Error("boom");
    };
    const res = await runSuite(suite, runner);
    expect(res.passed).toBe(0);
    expect(res.cases[0]!.error).toBe("boom");
    expect(res.cases[0]!.pass).toBe(false);
  });

  it("honors case weights in the aggregate score", async () => {
    const weighted: Suite = {
      name: "w",
      cases: [
        {
          id: "pass",
          input: "p",
          expected: "p",
          graders: [exact()],
          weight: 9,
        },
        {
          id: "fail",
          input: "f",
          expected: "f",
          graders: [exact()],
          weight: 1,
        },
      ],
    };
    const runner = fixtureRunner({ p: "p", f: "WRONG" });
    const res = await runSuite(weighted, runner);
    // 9*1 + 1*0 over weight 10 = 0.9
    expect(res.score).toBeCloseTo(0.9, 5);
  });

  it("is deterministic: same inputs → identical results", async () => {
    const runner = fixtureRunner({
      "in-a": "out-a",
      "in-b": "x",
      "in-c": "nope",
    });
    const r1 = await runSuite(suite, runner);
    const r2 = await runSuite(suite, runner);
    expect(r1).toEqual(r2);
  });
});
