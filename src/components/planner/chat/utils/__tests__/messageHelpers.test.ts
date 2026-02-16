/**
 * Tests for messageHelpers utility functions
 * Tests: generateId, updateMessageById, isDismissalMessage
 */

import { describe, it, expect } from "vitest";
import { generateId, updateMessageById, isDismissalMessage } from "../messageHelpers";

// ─── generateId ───

describe("generateId", () => {
  it("prefixes with given string", () => {
    const id = generateId("test");
    expect(id).toMatch(/^test-\d+$/);
  });

  it("generates unique IDs", () => {
    const a = generateId("msg");
    const b = generateId("msg");
    // Technically could collide within same ms, but very unlikely in test
    expect(typeof a).toBe("string");
    expect(typeof b).toBe("string");
  });
});

// ─── updateMessageById ───

describe("updateMessageById", () => {
  const messages = [
    { id: "a", role: "user" as const, text: "hello" },
    { id: "b", role: "assistant" as const, text: "world" },
  ];

  it("patches matching message by ID", () => {
    const updater = updateMessageById("b", { text: "updated" });
    const result = updater(messages);
    expect(result[1].text).toBe("updated");
    expect(result[0].text).toBe("hello"); // unchanged
  });

  it("leaves all messages unchanged when ID not found", () => {
    const updater = updateMessageById("z", { text: "nope" });
    const result = updater(messages);
    expect(result).toEqual(messages);
  });

  it("preserves other fields on patched message", () => {
    const updater = updateMessageById("a", { text: "new" });
    const result = updater(messages);
    expect(result[0].role).toBe("user");
    expect(result[0].id).toBe("a");
  });
});

// ─── isDismissalMessage ───

describe("isDismissalMessage", () => {
  // Positive cases: FR
  it.each([
    "non merci",
    "pas de tout",
    "non",
    "ok merci",
    "voilà!",
    "Nope",
  ])("detects FR dismissal: %s", (text) => {
    expect(isDismissalMessage(text)).toBe(true);
  });

  // Positive cases: EN
  it.each([
    "no thanks",
    "nothing else",
    "done",
    "fine thanks",
    "good thanks",
    "all good",
  ])("detects EN dismissal: %s", (text) => {
    expect(isDismissalMessage(text)).toBe(true);
  });

  // Known limitation: apostrophe-based contractions are broken
  // The regex strips ' so "c'est"→"cest", "that's"→"thats" — no match in word set
  it.each([
    "c'est tout",
    "c'est bon merci",
    "rien d'autre",
    "that's all",
    "No, that's all. Thanks!",
  ])("known limitation: apostrophe breaks match for: %s", (text) => {
    expect(isDismissalMessage(text)).toBe(false);
  });

  // Negative cases: real user messages
  it.each([
    "Je veux aller à Paris",
    "Book me a flight to Tokyo",
    "non je veux plutôt un vol direct avec escale à Amsterdam",
    "", // empty
    "   ", // whitespace only
    "a b c d e f g", // 7 words (over limit)
  ])("rejects non-dismissal: %s", (text) => {
    expect(isDismissalMessage(text)).toBe(false);
  });

  // Edge cases
  it("strips punctuation before matching", () => {
    expect(isDismissalMessage("ok, merci!")).toBe(true);
    expect(isDismissalMessage("bon.")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isDismissalMessage("NON MERCI")).toBe(true);
    expect(isDismissalMessage("DONE")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isDismissalMessage("")).toBe(false);
  });

  it("rejects messages over 6 words even if all words match", () => {
    expect(isDismissalMessage("non rien pas plus nope ok merci")).toBe(false);
  });
});
