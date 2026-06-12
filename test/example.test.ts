import { describe, it, expect } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { runSuite } from "../src/index.js";
import { saveRun, loadRun } from "../src/io.js";
import { suite, runner } from "../src/examples/suite.js";

describe("example suite", () => {
  it("the healthy fixture passes every case offline", async () => {
    const res = await runSuite(suite, runner);
    expect(res.passed).toBe(res.total);
    expect(res.score).toBe(1);
  });

  it("round-trips a run through save/load", async () => {
    const res = await runSuite(suite, runner, {
      timestamp: "2026-06-12T00:00:00Z",
    });
    const path = join(tmpdir(), `promptproof-${res.suite}.json`);
    try {
      saveRun(path, res);
      const loaded = loadRun(path);
      expect(loaded).toEqual(res);
    } finally {
      rmSync(path, { force: true });
    }
  });
});
