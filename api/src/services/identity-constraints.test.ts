import { IdentityConstraintEngine } from "./identity-constraints";
import { SigilIdentity } from "../types/identity";

describe("IdentityConstraintEngine", () => {
  let engine: IdentityConstraintEngine;

  const createIdentity = (rules: string[]): SigilIdentity => ({
    id: "id_123",
    name: "Test",
    developerId: "test@example.com",
    sigilHash: "sig_abc",
    version: 1,
    config: {
      customRules: rules,
    },
    versions: [],
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  });

  beforeEach(() => {
    engine = new IdentityConstraintEngine();
  });

  describe("must contain rule", () => {
    it("should pass when output contains required text", () => {
      const identity = createIdentity(["must contain: hello"]);
      const result = engine.evaluate("This output contains hello world", identity);

      expect(result.passed).toBe(true);
      expect(result.ruleChecks).toHaveLength(1);
      expect(result.ruleChecks[0].passed).toBe(true);
      expect(result.ruleChecks[0].detail).toContain("contains");
    });

    it("should fail when output missing required text", () => {
      const identity = createIdentity(["must contain: hello"]);
      const result = engine.evaluate("This output has no greeting", identity);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].message).toContain("must contain");
    });
  });

  describe("must not contain rule", () => {
    it("should pass when output does not contain forbidden text", () => {
      const identity = createIdentity(["must not contain: forbidden"]);
      const result = engine.evaluate("This output is clean", identity);

      expect(result.passed).toBe(true);
      expect(result.ruleChecks[0].passed).toBe(true);
    });

    it("should fail when output contains forbidden text", () => {
      const identity = createIdentity(["must not contain: forbidden"]);
      const result = engine.evaluate("This output has forbidden text", identity);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe("error");
    });
  });

  describe("tone rule", () => {
    it("should pass when output contains tone keyword", () => {
      const identity = createIdentity(["tone: professional"]);
      const result = engine.evaluate("This is professional output", identity);

      expect(result.passed).toBe(true);
    });

    it("should warn when output missing tone keyword", () => {
      const identity = createIdentity(["tone: professional"]);
      const result = engine.evaluate("This is casual output", identity);

      expect(result.passed).toBe(false);
      expect(result.violations[0].severity).toBe("warning");
    });
  });

  describe("multiple rules", () => {
    it("should evaluate all rules together", () => {
      const identity = createIdentity([
        "must contain: hello",
        "must not contain: forbidden",
      ]);
      const result = engine.evaluate("hello world", identity);

      expect(result.passed).toBe(true);
      expect(result.ruleChecks).toHaveLength(2);
    });

    it("should fail if any rule fails", () => {
      const identity = createIdentity([
        "must contain: hello",
        "must not contain: forbidden",
      ]);
      const result = engine.evaluate("hello forbidden", identity);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
    });
  });

  describe("unknown rules", () => {
    it("should log unknown rules but not flag violations", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      const identity = createIdentity(["unknown rule type"]);
      
      const result = engine.evaluate("some output", identity);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.ruleChecks[0].detail).toContain("Unknown rule type");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown rule")
      );

      consoleSpy.mockRestore();
    });
  });

  describe("no rules", () => {
    it("should pass when no rules defined", () => {
      const identity = createIdentity([]);
      const result = engine.evaluate("any output", identity);

      expect(result.passed).toBe(true);
      expect(result.ruleChecks).toHaveLength(0);
    });
  });
});
