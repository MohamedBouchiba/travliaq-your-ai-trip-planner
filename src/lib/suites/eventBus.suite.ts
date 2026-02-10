/**
 * Event Bus Test Suite
 * Tests the mitt-based event bus communication layer
 */
import { describe, it, expect, setCategory } from "@/lib/browser-test-runner";
import { eventBus, emitTabChange, emitMapZoom, emitTabAndZoom } from "@/lib/eventBus";

export function registerEventBusTests() {
  setCategory("eventBus");

  describe("eventBus core", () => {
    it("emits and receives events", () => {
      let received: any = null;
      const handler = (data: any) => { received = data; };
      eventBus.on("tab:change", handler);
      eventBus.emit("tab:change", { tab: "flights" });
      eventBus.off("tab:change", handler);
      expect(received?.tab).toBe("flights");
    });

    it("stops receiving after off()", () => {
      let callCount = 0;
      const handler = () => { callCount++; };
      eventBus.on("tab:change", handler);
      eventBus.emit("tab:change", { tab: "flights" });
      eventBus.off("tab:change", handler);
      eventBus.emit("tab:change", { tab: "stays" });
      expect(callCount).toBe(1);
    });

    it("multiple listeners receive the same event", () => {
      let count = 0;
      const h1 = () => { count++; };
      const h2 = () => { count++; };
      eventBus.on("tab:change", h1);
      eventBus.on("tab:change", h2);
      eventBus.emit("tab:change", { tab: "flights" });
      eventBus.off("tab:change", h1);
      eventBus.off("tab:change", h2);
      expect(count).toBe(2);
    });
  });

  describe("emitTabChange", () => {
    it("emits tab:change with correct tab", () => {
      let received: any = null;
      const handler = (data: any) => { received = data; };
      eventBus.on("tab:change", handler);
      emitTabChange("stays");
      eventBus.off("tab:change", handler);
      expect(received?.tab).toBe("stays");
    });
  });

  describe("emitMapZoom", () => {
    it("emits map:zoom with center and zoom", () => {
      let received: any = null;
      const handler = (data: any) => { received = data; };
      eventBus.on("map:zoom", handler);
      emitMapZoom([48.8566, 2.3522], 12);
      eventBus.off("map:zoom", handler);
      expect(received?.center[0]).toBeCloseTo(48.8566, 3);
      expect(received?.zoom).toBe(12);
    });
  });

  describe("emitTabAndZoom", () => {
    it("emits both tab:change and map:zoom", () => {
      let tabReceived: any = null;
      let zoomReceived: any = null;
      const tabHandler = (data: any) => { tabReceived = data; };
      const zoomHandler = (data: any) => { zoomReceived = data; };
      eventBus.on("tab:change", tabHandler);
      eventBus.on("map:zoom", zoomHandler);
      emitTabAndZoom("activities", [35.6762, 139.6503], 10);
      eventBus.off("tab:change", tabHandler);
      eventBus.off("map:zoom", zoomHandler);
      expect(tabReceived?.tab).toBe("activities");
      expect(zoomReceived?.zoom).toBe(10);
    });
  });
}
