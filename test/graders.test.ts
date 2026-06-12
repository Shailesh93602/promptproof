import { describe, it, expect } from "vitest";
import { exact, includes, matches, overlap, jsonShape } from "../src/index.js";

const ctx = (expected?: string) => ({ input: "q", expected });

describe("exact", () => {
  it("passes on an exact match (trimmed)", () => {
    const r = exact().grade("  hello  ", ctx("hello"));
    expect(r.pass).toBe(true);
    expect(r.score).toBe(1);
  });
  it("respects case sensitivity by default", () => {
    expect(exact().grade("Hello", ctx("hello")).pass).toBe(false);
    expect(exact({ ignoreCase: true }).grade("Hello", ctx("hello")).pass).toBe(
      true,
    );
  });
  it("fails clearly when no expected provided", () => {
    const r = exact().grade("x", ctx(undefined));
    expect(r.pass).toBe(false);
    expect(r.reason).toMatch(/expected/i);
  });
});

describe("includes", () => {
  it("requires all substrings by default with partial-credit score", () => {
    const r = includes(["alpha", "beta"]).grade("only alpha here", ctx());
    expect(r.pass).toBe(false);
    expect(r.score).toBe(0.5);
    expect(r.reason).toMatch(/beta/);
  });
  it("any-mode passes when one is present", () => {
    const r = includes(["alpha", "beta"], { mode: "any" }).grade(
      "beta only",
      ctx(),
    );
    expect(r.pass).toBe(true);
  });
});

describe("matches", () => {
  it("passes when the pattern matches", () => {
    expect(matches(/\[\d+\]/).grade("see [1]", ctx()).pass).toBe(true);
  });
  it("negate passes when the pattern is absent", () => {
    const phone = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/;
    expect(matches(phone, { negate: true }).grade("call us", ctx()).pass).toBe(
      true,
    );
    expect(
      matches(phone, { negate: true }).grade("call 555-123-4567", ctx()).pass,
    ).toBe(false);
  });
});

describe("overlap", () => {
  it("gives full credit for identical content", () => {
    const r = overlap().grade("refund within 30 days", ctx("refund 30 days"));
    expect(r.score).toBeGreaterThan(0.5);
    expect(r.pass).toBe(true);
  });
  it("scores low and fails for unrelated text", () => {
    const r = overlap().grade(
      "the weather is sunny today",
      ctx("refund policy thirty days"),
    );
    expect(r.pass).toBe(false);
  });
});

describe("jsonShape", () => {
  it("passes when all keys have the right types", () => {
    const g = jsonShape({ orderId: "string", eta: "number" });
    const r = g.grade('{"orderId":"123","eta":2}', ctx());
    expect(r.pass).toBe(true);
    expect(r.score).toBe(1);
  });
  it("fails on invalid JSON with score 0", () => {
    const r = jsonShape({ a: "string" }).grade("not json", ctx());
    expect(r.pass).toBe(false);
    expect(r.score).toBe(0);
  });
  it("partial-credits a type mismatch", () => {
    const g = jsonShape({ a: "string", b: "number" });
    const r = g.grade('{"a":"x","b":"oops"}', ctx());
    expect(r.pass).toBe(false);
    expect(r.score).toBe(0.5);
    expect(r.reason).toMatch(/"b" should be number/);
  });
});
