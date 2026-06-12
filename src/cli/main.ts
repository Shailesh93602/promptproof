#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import type { ModelRunner, Suite } from "../types.js";
import { runSuite } from "../core/run.js";
import { compareRuns, hasRegressions } from "../core/compare.js";
import { formatRun, formatComparison } from "../core/report.js";
import { saveRun, loadRun } from "../io.js";

const USAGE = `promptproof — catch LLM regressions before your users do

Usage:
  promptproof run <suite-module> [--save <file>] [--baseline <file>] [--json]
  promptproof compare <baseline.json> <current.json> [--json]

run:
  <suite-module>   a JS/TS module whose default export is { suite, runner }
  --save <file>    write the run result to <file> (your new baseline)
  --baseline <f>   compare this run against a saved baseline; exit 1 on regressions
  --json           print machine-readable JSON instead of a summary

compare:
  diff two saved run results; exit 1 if the current run has regressions

Examples:
  promptproof run ./evals/suite.ts --save baseline.json
  promptproof run ./evals/suite.ts --baseline baseline.json   # CI gate
`;

interface SuiteModule {
  suite: Suite;
  runner: ModelRunner;
}

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function loadSuiteModule(path: string): Promise<SuiteModule> {
  const abs = resolve(process.cwd(), path);
  const mod = (await import(pathToFileURL(abs).href)) as {
    default?: Partial<SuiteModule>;
    suite?: Suite;
    runner?: ModelRunner;
  };
  const suite = mod.default?.suite ?? mod.suite;
  const runner = mod.default?.runner ?? mod.runner;
  if (!suite || !runner) {
    throw new Error(
      `${path} must export { suite, runner } (default export or named exports)`,
    );
  }
  return { suite, runner };
}

async function cmdRun(args: string[]): Promise<number> {
  const modulePath = args[0];
  if (!modulePath) {
    process.stderr.write("error: missing <suite-module>\n\n" + USAGE);
    return 2;
  }
  const asJson = args.includes("--json");
  const savePath = getFlag(args, "--save");
  const baselinePath = getFlag(args, "--baseline");

  const { suite, runner } = await loadSuiteModule(modulePath);
  const result = await runSuite(suite, runner);

  if (savePath) saveRun(savePath, result);

  if (baselinePath) {
    const baseline = loadRun(baselinePath);
    const cmp = compareRuns(baseline, result);
    if (asJson) process.stdout.write(JSON.stringify(cmp, null, 2) + "\n");
    else process.stdout.write(formatComparison(cmp) + "\n");
    return hasRegressions(cmp) ? 1 : 0;
  }

  if (asJson) process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write(formatRun(result) + "\n");
  // A run with any failing case exits non-zero so it can gate CI on its own.
  return result.passed === result.total ? 0 : 1;
}

function cmdCompare(args: string[]): number {
  const [basePath, currPath] = args;
  if (!basePath || !currPath) {
    process.stderr.write("error: compare needs two files\n\n" + USAGE);
    return 2;
  }
  const cmp = compareRuns(loadRun(basePath), loadRun(currPath));
  if (args.includes("--json"))
    process.stdout.write(JSON.stringify(cmp, null, 2) + "\n");
  else process.stdout.write(formatComparison(cmp) + "\n");
  return hasRegressions(cmp) ? 1 : 0;
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  let code: number;
  switch (cmd) {
    case "run":
      code = await cmdRun(rest);
      break;
    case "compare":
      code = cmdCompare(rest);
      break;
    case undefined:
    case "-h":
    case "--help":
      process.stdout.write(USAGE);
      code = 0;
      break;
    default:
      process.stderr.write(`unknown command: ${cmd}\n\n` + USAGE);
      code = 2;
  }
  process.exitCode = code;
}

main().catch((err) => {
  process.stderr.write(
    `error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
