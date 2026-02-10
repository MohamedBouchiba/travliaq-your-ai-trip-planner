/**
 * Validators Test Suite
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import {
  validateDate,
  safeParseDate,
  isValidDate,
  validateNumber,
  safeParseNumber,
  validatePositiveInt,
  validatePrice,
  validateString,
  validateEmail,
  validateArray,
  validateTravelers,
  validateDateRange,
  isDefined,
  isNonEmptyString,
  isPositiveNumber,
  assert,
  assertDefined,
} from "@/components/planner/chat/utils/validators";

export function registerValidatorTests() {
  setCategory("validators");

  describe("validateDate", () => {
    it("validates valid date string", () => {
      const result = validateDate("2024-07-15");
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(Date);
    });
    it("validates Date object", () => {
      const date = new Date("2024-07-15");
      const result = validateDate(date);
      expect(result.success).toBe(true);
      expect(result.data).toBe(date);
    });
    it("returns error for invalid date string", () => {
      const result = validateDate("invalid");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid date");
    });
    it("returns error for null when required", () => {
      const result = validateDate(null);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Date is required");
    });
    it("accepts null when not required", () => {
      const result = validateDate(null, { required: false });
      expect(result.success).toBe(true);
    });
  });

  describe("validateNumber", () => {
    it("validates number", () => {
      const result = validateNumber(42);
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });
    it("parses string number", () => {
      const result = validateNumber("42.5");
      expect(result.success).toBe(true);
      expect(result.data).toBe(42.5);
    });
    it("returns error for NaN", () => {
      const result = validateNumber("not a number");
      expect(result.success).toBe(false);
    });
    it("validates min constraint", () => {
      const result = validateNumber(5, { min: 10 });
      expect(result.success).toBe(false);
    });
    it("validates max constraint", () => {
      const result = validateNumber(15, { max: 10 });
      expect(result.success).toBe(false);
    });
    it("validates integer constraint", () => {
      const result = validateNumber(5.5, { integer: true });
      expect(result.success).toBe(false);
    });
  });

  describe("validateString", () => {
    it("validates string", () => {
      const result = validateString("hello");
      expect(result.success).toBe(true);
      expect(result.data).toBe("hello");
    });
    it("trims string by default", () => {
      const result = validateString("  hello  ");
      expect(result.data).toBe("hello");
    });
    it("returns error for empty when required", () => {
      const result = validateString("");
      expect(result.success).toBe(false);
    });
    it("validates minLength", () => {
      const result = validateString("ab", { minLength: 3 });
      expect(result.success).toBe(false);
    });
    it("validates maxLength", () => {
      const result = validateString("hello", { maxLength: 3 });
      expect(result.success).toBe(false);
    });
  });

  describe("validateEmail", () => {
    it("validates correct email", () => {
      expect(validateEmail("user@example.com").success).toBe(true);
    });
    it("rejects invalid email", () => {
      expect(validateEmail("invalid-email").success).toBe(false);
    });
  });

  describe("validateTravelers", () => {
    it("validates correct travelers", () => {
      const result = validateTravelers({ adults: 2, children: 1, infants: 0 });
      expect(result.success).toBe(true);
    });
    it("requires at least 1 adult", () => {
      const result = validateTravelers({ adults: 0 });
      expect(result.success).toBe(false);
    });
    it("rejects more infants than adults", () => {
      const result = validateTravelers({ adults: 1, infants: 2 });
      expect(result.success).toBe(false);
    });
    it("rejects more than 9 travelers", () => {
      const result = validateTravelers({ adults: 5, children: 3, infants: 2 });
      expect(result.success).toBe(false);
    });
  });

  describe("validateDateRange", () => {
    it("validates correct date range", () => {
      const result = validateDateRange("2024-07-15", "2024-07-20");
      expect(result.success).toBe(true);
    });
    it("returns error when return before departure", () => {
      const result = validateDateRange("2024-07-20", "2024-07-15");
      expect(result.success).toBe(false);
    });
  });

  describe("Type guards", () => {
    it("isDefined", () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });
    it("isNonEmptyString", () => {
      expect(isNonEmptyString("hello")).toBe(true);
      expect(isNonEmptyString("")).toBe(false);
      expect(isNonEmptyString("   ")).toBe(false);
    });
    it("isPositiveNumber", () => {
      expect(isPositiveNumber(42)).toBe(true);
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
    });
  });

  describe("assert", () => {
    it("does not throw for true", () => {
      expect(() => assert(true, "test")).not.toThrow();
    });
    it("throws for false", () => {
      expect(() => assert(false, "test")).toThrow("Assertion failed");
    });
  });
}
