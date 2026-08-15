import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * End-to-end tests for the CLI as a user actually invokes it: `node` running the
 * built artifact. The README's headline promise is a CI gate that "fails the
 * build on any pass -> fail" — that is an *exit code*, so it has to be checked
 * by running the binary, not by calling compareRuns in-process.
 *
 * Requires `npm run build` to have run first (the `check` script builds before
 * testing, and `prepare` builds on install).
 */

const CLI = resolve(__dirname, "../dist/cli/main.js");
const DIST = pathToFileURL(resolve(__dirname, "../dist/index.js")).href;

let dir: string;

/** Write a suite module whose fixture answers can be sabotaged per-case. */
function writeSuite(name: string, answers: Record<string, string>): string {
  const file = join(dir, name);
  writeFileSync(
    file,
    `import { exact } from ${JSON.stringify(DIST)};
export const suite = {
  name: "gate-demo",
  cases: [
    { id: "a", input: "a", expected: "A", graders: [exact()] },
    { id: "b", input: "b", expected: "B", graders: [exact()] },
    { id: "c", input: "c", expected: "C", graders: [exact()] },
  ],
};
const table = ${JSON.stringify(answers)};
export const runner = (input) => table[input] ?? "";
export default { suite, runner };
`,
    "utf8",
  );
  return file;
}

/** Run the CLI, returning its exit code and combined output. */
function cli(args: string[], nodeArgs: string[] = []) {
  try {
    const stdout = execFileSync("node", [...nodeArgs, CLI, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out: stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

describe("CLI (end-to-end, against the built artifact)", () => {
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "promptproof-cli-"));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("a healthy run exits 0", () => {
    const suite = writeSuite("good.mjs", { a: "A", b: "B", c: "C" });
    const r = cli(["run", suite]);
    expect(r.out).toContain("Passed 3/3");
    expect(r.code).toBe(0);
  });

  it("the CI gate exits 1 on a deliberately introduced regression", () => {
    const good = writeSuite("base.mjs", { a: "A", b: "B", c: "C" });
    const baseline = join(dir, "baseline.json");
    expect(cli(["run", good, "--save", baseline]).code).toBe(0);

    // Break exactly one case, the way a bad prompt change would.
    const broken = writeSuite("broken.mjs", { a: "A", b: "WRONG", c: "C" });
    const r = cli(["run", broken, "--baseline", baseline]);

    expect(r.out).toContain("REGRESSIONS (pass → fail)");
    expect(r.out).toContain("✗ b");
    expect(r.code).toBe(1); // the gate that fails the build
  });

  it("an unchanged run against the same baseline exits 0", () => {
    const good = writeSuite("same.mjs", { a: "A", b: "B", c: "C" });
    const baseline = join(dir, "baseline2.json");
    cli(["run", good, "--save", baseline]);
    const r = cli(["run", good, "--baseline", baseline]);
    expect(r.out).toContain("Regressions 0");
    expect(r.code).toBe(0);
  });

  it("`compare` of two saved runs exits 1 when the current one regressed", () => {
    const good = writeSuite("c-good.mjs", { a: "A", b: "B", c: "C" });
    const bad = writeSuite("c-bad.mjs", { a: "A", b: "WRONG", c: "C" });
    const f1 = join(dir, "r1.json");
    const f2 = join(dir, "r2.json");
    cli(["run", good, "--save", f1]);
    cli(["run", bad, "--save", f2]);

    expect(cli(["compare", f1, f2]).code).toBe(1); // regressed
    expect(cli(["compare", f2, f1]).code).toBe(0); // improved
  });

  it("explains how to load a TypeScript suite instead of leaking a loader error", () => {
    const ts = join(dir, "suite.ts");
    writeFileSync(
      ts,
      "export const suite = {};\nexport const runner = () => '';\n",
      "utf8",
    );

    // Node >= 22.6 strips types by default; turn that off so both the CI Node
    // (20) and a modern local Node exercise the same unsupported-extension path.
    const major = Number(process.versions.node.split(".")[0]);
    const nodeArgs = major >= 22 ? ["--no-experimental-strip-types"] : [];

    const r = cli(["run", ts], nodeArgs);
    expect(r.out).not.toContain("Unknown file extension");
    expect(r.out).toContain("is TypeScript");
    expect(r.out).toContain("tsx");
    expect(r.code).toBe(1);
  });

  it("--help exits 0 and prints usage", () => {
    const r = cli(["--help"]);
    expect(r.out).toContain("Usage:");
    expect(r.code).toBe(0);
  });
});
