/**
 * Security Test Suite
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import {
  escapeHtml,
  escapeHtmlAttribute,
  sanitizeFilename,
  encodeURIComponentSafe,
  base64UrlEncode,
  base64UrlDecode,
  stripHtmlTags,
  safeJsonParse,
  truncateSafe,
} from "@/components/planner/chat/utils/security";

export function registerSecurityTests() {
  setCategory("security");

  describe("escapeHtml", () => {
    it("escapes HTML special characters", () => {
      const result = escapeHtml('<script>alert("xss")</script>');
      expect(result).toContain("&lt;script&gt;");
    });
    it("returns empty for empty input", () => {
      expect(escapeHtml("")).toBe("");
    });
    it("escapes ampersands", () => {
      expect(escapeHtml("a & b")).toContain("&amp;");
    });
    it("escapes quotes", () => {
      const result = escapeHtml('"hello"');
      expect(result).toContain("&quot;");
    });
  });

  describe("sanitizeFilename", () => {
    it("sanitizes dangerous characters", () => {
      const result = sanitizeFilename("../../etc/passwd");
      expect(result).not.toContain("..");
    });
    it("returns 'file' for null input", () => {
      expect(sanitizeFilename(null)).toBe("file");
    });
    it("keeps normal filenames", () => {
      const result = sanitizeFilename("document.pdf");
      expect(result).toContain("document");
    });
  });

  describe("stripHtmlTags", () => {
    it("strips all HTML tags", () => {
      expect(stripHtmlTags("<p>Hello</p>")).toBe("Hello");
    });
    it("handles nested tags", () => {
      expect(stripHtmlTags("<div><b>Bold</b></div>")).toBe("Bold");
    });
    it("handles empty string", () => {
      expect(stripHtmlTags("")).toBe("");
    });
  });

  describe("safeJsonParse", () => {
    it("parses valid JSON", () => {
      expect(safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    });
    it("returns null for invalid JSON", () => {
      expect(safeJsonParse("invalid")).toBeNull();
    });
    it("parses arrays", () => {
      expect(safeJsonParse("[1,2,3]")).toEqual([1, 2, 3]);
    });
  });

  describe("truncateSafe", () => {
    it("truncates long strings", () => {
      const result = truncateSafe("Hello World", 5, "");
      expect(result).toHaveLength(5);
    });
    it("does not truncate short strings", () => {
      expect(truncateSafe("Hi", 10, "")).toBe("Hi");
    });
  });

  describe("base64Url", () => {
    it("encodes and decodes roundtrip", () => {
      const original = "Hello World!";
      const encoded = base64UrlEncode(original);
      expect(base64UrlDecode(encoded)).toBe(original);
    });
    it("handles special characters", () => {
      const original = "café résumé naïve";
      const encoded = base64UrlEncode(original);
      expect(base64UrlDecode(encoded)).toBe(original);
    });
  });

  describe("encodeURIComponentSafe", () => {
    it("encodes special characters", () => {
      expect(encodeURIComponentSafe("hello world")).toBe("hello%20world");
    });
    it("returns empty for null", () => {
      expect(encodeURIComponentSafe(null as any)).toBe("");
    });
  });
}
