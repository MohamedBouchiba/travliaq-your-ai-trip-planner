/**
 * Parse Action Test Suite
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { parseAction } from "@/components/planner/chat/utils/parseAction";

export function registerParseActionTests() {
  setCategory("parseAction");

  describe("parseAction", () => {
    it("returns clean content when no action tag", () => {
      const result = parseAction("Hello, how can I help?");
      expect(result.cleanContent).toBe("Hello, how can I help?");
      expect(result.action).toBeNull();
    });
    it("removes action tag from content", () => {
      const content = 'I found flights! <action>{"type": "zoom", "city": "Paris"}</action>';
      const result = parseAction(content);
      expect(result.cleanContent).toBe("I found flights!");
    });
    it("parses zoom action with known city", () => {
      const result = parseAction('<action>{"type": "zoom", "city": "Paris"}</action>');
      expect(result.action).not.toBeNull();
      expect(result.action?.type).toBe("zoom");
    });
    it("returns null action for unknown city", () => {
      const result = parseAction('<action>{"type": "zoom", "city": "UnknownCity123"}</action>');
      expect(result.action).toBeNull();
    });
    it("parses tab action", () => {
      const result = parseAction('<action>{"type": "tab", "tab": "flights"}</action>');
      expect(result.action?.type).toBe("tab");
    });
    it("handles malformed JSON gracefully", () => {
      const result = parseAction('<action>{invalid}</action> Text');
      expect(result.cleanContent).toBe("Text");
      expect(result.action).toBeNull();
    });
    it("handles empty string", () => {
      const result = parseAction("");
      expect(result.cleanContent).toBe("");
      expect(result.action).toBeNull();
    });
    it("handles content with multiple action tags (takes first)", () => {
      const result = parseAction('Text <action>{"type":"tab","tab":"flights"}</action> More <action>{"type":"tab","tab":"stays"}</action>');
      expect(result.action?.type).toBe("tab");
    });
  });
}
