/**
 * parseAction Tests
 */

import { describe, it, expect } from "vitest";
import { parseAction } from "../parseAction";

describe("parseAction", () => {
  it("returns clean content when no action tag present", () => {
    const content = "Hello, how can I help you with your travel plans?";
    const result = parseAction(content);

    expect(result.cleanContent).toBe(content);
    expect(result.action).toBeNull();
  });

  it("removes action tag from content", () => {
    const content = 'I found flights to Paris! <action>{"type": "zoom", "city": "Paris"}</action>';
    const result = parseAction(content);

    expect(result.cleanContent).toBe("I found flights to Paris!");
  });

  it("parses zoom action with known city", () => {
    const content = '<action>{"type": "zoom", "city": "Paris"}</action>';
    const result = parseAction(content);

    expect(result.action).not.toBeNull();
    expect(result.action?.type).toBe("zoom");
    expect(result.action).toHaveProperty("center");
    expect(result.action).toHaveProperty("zoom", 12);
  });

  it("returns null action for unknown city in zoom", () => {
    const content = '<action>{"type": "zoom", "city": "UnknownCity123"}</action>';
    const result = parseAction(content);

    expect(result.action).toBeNull();
  });

  it("parses tab action", () => {
    const content = '<action>{"type": "tab", "tab": "flights"}</action>';
    const result = parseAction(content);

    expect(result.action).not.toBeNull();
    expect(result.action?.type).toBe("tab");
    expect(result.action).toHaveProperty("tab", "flights");
  });

  it("parses tabAndZoom action", () => {
    const content = '<action>{"type": "tabAndZoom", "tab": "activities", "city": "Rome"}</action>';
    const result = parseAction(content);

    expect(result.action).not.toBeNull();
    expect(result.action?.type).toBe("tabAndZoom");
    expect(result.action).toHaveProperty("tab", "activities");
    expect(result.action).toHaveProperty("center");
    expect(result.action).toHaveProperty("zoom", 12);
  });

  it("handles malformed JSON gracefully", () => {
    const content = '<action>{invalid json}</action> Some text';
    const result = parseAction(content);

    expect(result.cleanContent).toBe("Some text");
    expect(result.action).toBeNull();
  });

  it("handles multiline action tags", () => {
    const content = `Looking at Barcelona!
<action>{"type": "zoom", "city": "Barcelona"}</action>

Great choice!`;
    const result = parseAction(content);

    expect(result.cleanContent).toBe("Looking at Barcelona!\n\n\nGreat choice!");
    expect(result.action).not.toBeNull();
  });

  it("handles multiple action tags (uses first)", () => {
    const content = '<action>{"type": "tab", "tab": "flights"}</action> Text <action>{"type": "tab", "tab": "stays"}</action>';
    const result = parseAction(content);

    // First action should be used
    expect(result.action?.type).toBe("tab");
    expect(result.action).toHaveProperty("tab", "flights");
  });

  it("correctly identifies Paris coordinates", () => {
    const content = '<action>{"type": "zoom", "city": "Paris"}</action>';
    const result = parseAction(content);

    expect(result.action).not.toBeNull();
    if (result.action?.type === "zoom") {
      expect(result.action.center[0]).toBeCloseTo(2.3522, 2);
      expect(result.action.center[1]).toBeCloseTo(48.8566, 2);
    }
  });

  it("correctly identifies Londres/London coordinates", () => {
    const content = '<action>{"type": "zoom", "city": "Londres"}</action>';
    const result = parseAction(content);

    expect(result.action).not.toBeNull();
    if (result.action?.type === "zoom") {
      expect(result.action.center[0]).toBeCloseTo(-0.1278, 2);
      expect(result.action.center[1]).toBeCloseTo(51.5074, 2);
    }
  });
});
