/**
 * Tests for useWidgetCooldown hook
 * Tests: canShowWidget, getBlockReason, recordWidgetShown/Confirmed, REFINABLE_WIDGETS
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWidgetCooldown } from "../useWidgetCooldown";
import type { WidgetType } from "@/types/flight";

// Mock debugStore to avoid side effects
vi.mock("@/stores/debugStore", () => ({
  useDebugStore: Object.assign(vi.fn(() => ({})), {
    getState: () => ({
      addUserInteraction: vi.fn(),
    }),
  }),
}));

describe("useWidgetCooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── canShowWidget ───

  it("allows a widget never shown before", () => {
    const { result } = renderHook(() => useWidgetCooldown());
    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(true);
  });

  it("blocks widget during standard cooldown (60s)", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("citySelector" as WidgetType);
    });

    // Within cooldown
    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(false);

    // After 30s — still blocked
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(false);

    // After 61s — unblocked
    act(() => { vi.advanceTimersByTime(31_000); });
    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(true);
  });

  it("permanently blocks confirmed one-shot widget (e.g. dateRangePicker)", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("dateRangePicker" as WidgetType);
      result.current.recordWidgetConfirmed("dateRangePicker" as WidgetType);
    });

    // Immediately blocked
    expect(result.current.canShowWidget("dateRangePicker" as WidgetType)).toBe(false);

    // Still blocked after 5 minutes
    act(() => { vi.advanceTimersByTime(300_000); });
    expect(result.current.canShowWidget("dateRangePicker" as WidgetType)).toBe(false);
  });

  it("permanently blocks confirmed preference widget (F8: no more REFINABLE_WIDGETS)", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("preferenceInterests" as WidgetType);
      result.current.recordWidgetConfirmed("preferenceInterests" as WidgetType);
    });

    // Blocked immediately
    expect(result.current.canShowWidget("preferenceInterests" as WidgetType)).toBe(false);

    // Still blocked after 5 minutes (permanent, not just cooldown)
    act(() => { vi.advanceTimersByTime(300_000); });
    expect(result.current.canShowWidget("preferenceInterests" as WidgetType)).toBe(false);
  });

  it("permanently blocks confirmed preferenceStyle (F8: no more REFINABLE_WIDGETS)", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("preferenceStyle" as WidgetType);
      result.current.recordWidgetConfirmed("preferenceStyle" as WidgetType);
    });

    expect(result.current.canShowWidget("preferenceStyle" as WidgetType)).toBe(false);

    // Still blocked after 5 minutes
    act(() => { vi.advanceTimersByTime(300_000); });
    expect(result.current.canShowWidget("preferenceStyle" as WidgetType)).toBe(false);
  });

  it("blocks after max attempts (2)", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    // Show twice
    act(() => {
      result.current.recordWidgetShown("citySelector" as WidgetType);
    });
    act(() => { vi.advanceTimersByTime(61_000); });
    act(() => {
      result.current.recordWidgetShown("citySelector" as WidgetType);
    });
    act(() => { vi.advanceTimersByTime(61_000); });

    // Max attempts reached — blocked even after cooldown
    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(false);
  });

  it("applies 120s penalty when user typed instead", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("citySelector" as WidgetType);
    });

    // User types within 30s → penalty applied
    act(() => { vi.advanceTimersByTime(5_000); });
    act(() => {
      result.current.recordUserTypedInstead("citySelector" as WidgetType);
    });

    // After 60s (standard cooldown) — still blocked due to penalty
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(false);

    // After total 125s from show — unblocked (past 120s penalty)
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(true);
  });

  // ─── getBlockReason ───

  it("returns null for unknown widget", () => {
    const { result } = renderHook(() => useWidgetCooldown());
    expect(result.current.getBlockReason("citySelector" as WidgetType)).toBeNull();
  });

  it("returns 'already_confirmed' for confirmed one-shot widget", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("dateRangePicker" as WidgetType);
      result.current.recordWidgetConfirmed("dateRangePicker" as WidgetType);
    });

    expect(result.current.getBlockReason("dateRangePicker" as WidgetType)).toBe("already_confirmed");
  });

  it("returns 'cooldown' for recently shown widget", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("citySelector" as WidgetType);
    });

    expect(result.current.getBlockReason("citySelector" as WidgetType)).toBe("cooldown");
  });

  // ─── getBlockedWidgets ───

  it("returns correct list of blocked widgets", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("citySelector" as WidgetType);
      result.current.recordWidgetShown("dateRangePicker" as WidgetType);
    });

    const blocked = result.current.getBlockedWidgets();
    expect(blocked).toContain("citySelector");
    expect(blocked).toContain("dateRangePicker");
  });

  // ─── resetCooldowns ───

  it("clears all history on reset", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    act(() => {
      result.current.recordWidgetShown("citySelector" as WidgetType);
      result.current.recordWidgetConfirmed("citySelector" as WidgetType);
    });

    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(false);

    act(() => {
      result.current.resetCooldowns();
    });

    expect(result.current.canShowWidget("citySelector" as WidgetType)).toBe(true);
  });

  // ─── getAttemptCount ───

  it("tracks attempt count", () => {
    const { result } = renderHook(() => useWidgetCooldown());

    expect(result.current.getAttemptCount("citySelector" as WidgetType)).toBe(0);

    act(() => {
      result.current.recordWidgetShown("citySelector" as WidgetType);
    });

    expect(result.current.getAttemptCount("citySelector" as WidgetType)).toBe(1);
  });
});
