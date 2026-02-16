/**
 * useBugReport - Collects exhaustive debug data and uploads to Supabase Storage.
 *
 * Rate limit: user must send at least 5 messages between reports.
 * Flow: instant upload on click → returns reportId → optional comment upload.
 */

import { useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebugStore } from "@/stores/debugStore";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const LS_KEY_LAST_TS = "bugReport_lastTimestamp";
const LS_KEY_MSG_SINCE = "bugReport_messagesSince";
const MIN_MESSAGES_BETWEEN_REPORTS = 3;

interface UseBugReportOptions {
  activeSessionId: string | null;
  userMessageCount: number;
}

export function useBugReport({ activeSessionId, userMessageCount }: UseBugReportOptions) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const lastUploadRef = useRef<{ filePath: string; payload: Record<string, unknown>; userId: string } | null>(null);

  // Rate limit: check messages sent since last report
  const canReport = useMemo(() => {
    const lastTs = localStorage.getItem(LS_KEY_LAST_TS);
    if (!lastTs) return userMessageCount >= MIN_MESSAGES_BETWEEN_REPORTS;
    const msgSince = parseInt(localStorage.getItem(LS_KEY_MSG_SINCE) || "0", 10);
    return msgSince >= MIN_MESSAGES_BETWEEN_REPORTS;
  }, [userMessageCount]);

  const messagesUntilReport = useMemo(() => {
    const lastTs = localStorage.getItem(LS_KEY_LAST_TS);
    if (!lastTs) return Math.max(0, MIN_MESSAGES_BETWEEN_REPORTS - userMessageCount);
    const msgSince = parseInt(localStorage.getItem(LS_KEY_MSG_SINCE) || "0", 10);
    return Math.max(0, MIN_MESSAGES_BETWEEN_REPORTS - msgSince);
  }, [userMessageCount]);

  /** Call this every time the user sends a message to track rate limit */
  const trackUserMessage = useCallback(() => {
    const current = parseInt(localStorage.getItem(LS_KEY_MSG_SINCE) || "0", 10);
    localStorage.setItem(LS_KEY_MSG_SINCE, String(current + 1));
  }, []);

  /** Collect all debug data and upload immediately */
  const submitReport = useCallback(async (): Promise<string | null> => {
    if (isUploading) return null;
    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t("planner.error.auth"));
        return null;
      }

      const debugState = useDebugStore.getState();

      const payload = {
        meta: {
          user_id: user.id,
          user_email: user.email,
          session_id: activeSessionId,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          url: window.location.href,
          language: navigator.language,
          viewport: { width: window.innerWidth, height: window.innerHeight },
          screen: { width: screen.width, height: screen.height },
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          online: navigator.onLine,
          memory: (navigator as any).deviceMemory ?? null,
          connection: (navigator as any).connection
            ? {
                effectiveType: (navigator as any).connection.effectiveType,
                downlink: (navigator as any).connection.downlink,
                rtt: (navigator as any).connection.rtt,
              }
            : null,
        },
        userComment: null as string | null,
        messageTimeline: debugState.messageTimeline,
        lastIntent: debugState.lastIntent,
        intentHistory: debugState.intentHistory,
        reasoning: debugState.reasoning,
        flowState: debugState.flowState,
        memoryContext: debugState.memoryContext,
        phaseHistory: debugState.phaseHistory,
        toolExecutions: debugState.toolExecutions,
        streamErrors: debugState.streamErrors,
        widgetErrors: debugState.widgetErrors,
        sseParseErrors: debugState.sseParseErrors,
        retryAttempts: debugState.retryAttempts,
        userInteractions: debugState.userInteractions,
        blockedActions: debugState.blockedActions,
        eventBusLog: debugState.eventBusLog,
        rawResponses: debugState.rawResponses,
        chronologicalTimeline: buildChronologicalTimeline(debugState),
      };

      const random = Math.random().toString(36).substring(2, 8);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const filePath = `${user.id}/${ts}_${random}.json`;

      const { error } = await supabase.storage
        .from("bug-reports")
        .upload(filePath, JSON.stringify(payload, null, 2), {
          contentType: "application/json",
          upsert: false,
        });

      if (error) {
        console.error("[useBugReport] Upload error:", error);
        toast.error("Erreur lors de l'envoi du rapport");
        return null;
      }

      localStorage.setItem(LS_KEY_LAST_TS, String(Date.now()));
      localStorage.setItem(LS_KEY_MSG_SINCE, "0");

      const reportId = `${ts}_${random}`;
      // Store for potential comment re-upload
      lastUploadRef.current = { filePath, payload, userId: user.id };
      toast.success(t("planner.chat.reportBugSent"));
      return reportId;
    } catch (err) {
      console.error("[useBugReport] Error:", err);
      toast.error("Erreur lors de l'envoi du rapport");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, activeSessionId, t]);

  /** Re-upload the same file with user comment added */
  const submitComment = useCallback(
    async (_reportId: string, comment: string) => {
      if (!comment.trim() || !lastUploadRef.current) return;

      try {
        const { filePath, payload } = lastUploadRef.current;
        const updatedPayload = { ...payload, userComment: comment.trim() };

        await supabase.storage
          .from("bug-reports")
          .upload(filePath, JSON.stringify(updatedPayload, null, 2), {
            contentType: "application/json",
            upsert: true,
          });
      } catch (err) {
        console.error("[useBugReport] Comment re-upload error:", err);
      }
    },
    []
  );

  return { canReport, messagesUntilReport, isUploading, submitReport, submitComment, trackUserMessage };
}

/** Merge all timestamped entries into a single sorted timeline */
function buildChronologicalTimeline(state: ReturnType<typeof useDebugStore.getState>) {
  const entries: Array<{ timestamp: number; type: string; data: unknown }> = [];

  for (const m of state.messageTimeline) {
    entries.push({ timestamp: m.timestamp, type: "message", data: m });
  }
  for (const t of state.toolExecutions) {
    entries.push({ timestamp: t.timestamp, type: "tool", data: t });
  }
  for (const e of state.streamErrors) {
    entries.push({ timestamp: e.timestamp, type: "streamError", data: e });
  }
  for (const r of state.retryAttempts) {
    entries.push({ timestamp: r.timestamp, type: "retry", data: r });
  }
  for (const w of state.widgetErrors) {
    entries.push({ timestamp: w.timestamp, type: "widgetError", data: w });
  }
  for (const s of state.sseParseErrors) {
    entries.push({ timestamp: s.timestamp, type: "sseParseError", data: s });
  }
  for (const i of state.intentHistory) {
    entries.push({ timestamp: i.timestamp, type: "intent", data: i });
  }
  for (const p of state.phaseHistory) {
    entries.push({ timestamp: p.timestamp, type: "phaseTransition", data: p });
  }
  for (const u of state.userInteractions) {
    entries.push({ timestamp: u.timestamp, type: "userInteraction", data: u });
  }
  for (const b of state.blockedActions) {
    entries.push({ timestamp: b.timestamp, type: "blockedAction", data: b });
  }
  for (const ev of state.eventBusLog) {
    entries.push({ timestamp: ev.timestamp, type: "eventBus", data: ev });
  }
  for (const r of state.rawResponses) {
    entries.push({ timestamp: r.timestamp, type: "rawResponse", data: { requestId: r.requestId } });
  }

  return entries.sort((a, b) => a.timestamp - b.timestamp);
}
