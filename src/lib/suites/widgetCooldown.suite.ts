/**
 * Widget Cooldown Test Suite
 * Tests cooldown logic as pure functions (simulated without React hooks)
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";

// Since useWidgetCooldown is a React hook, we test the pure logic inline
const WIDGET_COOLDOWN_MS = 60000;
const MAX_WIDGET_ATTEMPTS = 2;
const USER_TYPED_PENALTY_MS = 120000;

interface WidgetRecord {
  widgetType: string;
  shownAt: number;
  confirmed: boolean;
  dismissed: boolean;
  userTypedInstead: boolean;
  attempts: number;
}

function canShowWidget(record: WidgetRecord | undefined, now: number): boolean {
  if (!record) return true;
  if (record.confirmed) return false;
  if (record.attempts >= MAX_WIDGET_ATTEMPTS) return false;
  if (record.userTypedInstead && now - record.shownAt < USER_TYPED_PENALTY_MS) return false;
  if (now - record.shownAt < WIDGET_COOLDOWN_MS) return false;
  return true;
}

function getBlockReason(record: WidgetRecord | undefined, now: number): string | null {
  if (!record) return null;
  if (record.confirmed) return "already_confirmed";
  if (record.attempts >= MAX_WIDGET_ATTEMPTS) return "max_attempts";
  if (record.userTypedInstead && now - record.shownAt < USER_TYPED_PENALTY_MS) return "user_prefers_typing";
  if (now - record.shownAt < WIDGET_COOLDOWN_MS) return "cooldown";
  return null;
}

export function registerWidgetCooldownTests() {
  setCategory("widgetCooldown");

  describe("canShowWidget", () => {
    it("returns true when no record exists", () => {
      expect(canShowWidget(undefined, Date.now())).toBe(true);
    });

    it("returns false when confirmed", () => {
      const record: WidgetRecord = { widgetType: "preferenceStyle", shownAt: Date.now() - 100000, confirmed: true, dismissed: false, userTypedInstead: false, attempts: 1 };
      expect(canShowWidget(record, Date.now())).toBe(false);
    });

    it("returns false when max attempts reached", () => {
      const record: WidgetRecord = { widgetType: "preferenceStyle", shownAt: Date.now() - 100000, confirmed: false, dismissed: false, userTypedInstead: false, attempts: 2 };
      expect(canShowWidget(record, Date.now())).toBe(false);
    });

    it("returns false during cooldown period", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "preferenceStyle", shownAt: now - 30000, confirmed: false, dismissed: false, userTypedInstead: false, attempts: 1 };
      expect(canShowWidget(record, now)).toBe(false);
    });

    it("returns true after cooldown expires", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "preferenceStyle", shownAt: now - 61000, confirmed: false, dismissed: false, userTypedInstead: false, attempts: 1 };
      expect(canShowWidget(record, now)).toBe(true);
    });

    it("returns false during user-typed penalty", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "preferenceStyle", shownAt: now - 90000, confirmed: false, dismissed: false, userTypedInstead: true, attempts: 1 };
      expect(canShowWidget(record, now)).toBe(false);
    });

    it("returns true after user-typed penalty expires", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "preferenceStyle", shownAt: now - 121000, confirmed: false, dismissed: false, userTypedInstead: true, attempts: 1 };
      expect(canShowWidget(record, now)).toBe(true);
    });

    it("confirmed takes priority over expired cooldown", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "preferenceStyle", shownAt: now - 200000, confirmed: true, dismissed: false, userTypedInstead: false, attempts: 1 };
      expect(canShowWidget(record, now)).toBe(false);
    });

    it("max_attempts takes priority over expired cooldown", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "preferenceStyle", shownAt: now - 200000, confirmed: false, dismissed: false, userTypedInstead: false, attempts: 2 };
      expect(canShowWidget(record, now)).toBe(false);
    });
  });

  describe("getBlockReason", () => {
    it("returns null when no record", () => {
      expect(getBlockReason(undefined, Date.now())).toBeNull();
    });

    it("returns 'already_confirmed' for confirmed widget", () => {
      const record: WidgetRecord = { widgetType: "x", shownAt: 0, confirmed: true, dismissed: false, userTypedInstead: false, attempts: 1 };
      expect(getBlockReason(record, Date.now())).toBe("already_confirmed");
    });

    it("returns 'max_attempts' when limit reached", () => {
      const record: WidgetRecord = { widgetType: "x", shownAt: 0, confirmed: false, dismissed: false, userTypedInstead: false, attempts: 2 };
      expect(getBlockReason(record, Date.now())).toBe("max_attempts");
    });

    it("returns 'user_prefers_typing' during penalty", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "x", shownAt: now - 60000, confirmed: false, dismissed: false, userTypedInstead: true, attempts: 1 };
      expect(getBlockReason(record, now)).toBe("user_prefers_typing");
    });

    it("returns 'cooldown' during normal cooldown", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "x", shownAt: now - 30000, confirmed: false, dismissed: false, userTypedInstead: false, attempts: 1 };
      expect(getBlockReason(record, now)).toBe("cooldown");
    });

    it("returns null when all conditions cleared", () => {
      const now = Date.now();
      const record: WidgetRecord = { widgetType: "x", shownAt: now - 200000, confirmed: false, dismissed: false, userTypedInstead: false, attempts: 1 };
      expect(getBlockReason(record, now)).toBeNull();
    });
  });

  describe("cooldown constants", () => {
    it("cooldown is 60 seconds", () => {
      expect(WIDGET_COOLDOWN_MS).toBe(60000);
    });

    it("max attempts is 2", () => {
      expect(MAX_WIDGET_ATTEMPTS).toBe(2);
    });

    it("user-typed penalty is 120 seconds", () => {
      expect(USER_TYPED_PENALTY_MS).toBe(120000);
    });
  });
}
