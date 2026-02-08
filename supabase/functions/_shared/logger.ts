/**
 * Centralized Logger for Edge Functions with Sentry Integration
 * 
 * Features:
 * - Structured JSON logging for Supabase logs
 * - Request ID tracing across frontend/backend
 * - Tool execution tracking with latency metrics
 * - Azure OpenAI call tracking with token usage
 * - Batch buffering for Sentry via existing tunnel
 */

const SENTRY_TUNNEL_URL = "https://cinbnmlfpffmyjmkwbco.supabase.co/functions/v1/sentry-tunnel";
const SENTRY_DSN = "https://1b9edfe2871f3976f2bb29233636e5c4@o4510257788616704.ingest.de.sentry.io/4510262563045456";

export type LogLevel = "debug" | "info" | "warning" | "error" | "fatal";

export type LogCategory = 
  | "planner_chat"
  | "azure_openai"
  | "tool_execution"
  | "tool_validation"
  | "request"
  | "response"
  | "error"
  | "performance";

export interface LogEvent {
  request_id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  user_id?: string;
  data?: Record<string, unknown>;
  latency_ms?: number;
  tokens_used?: number;
  tool_name?: string;
}

interface SentryBreadcrumb {
  type?: string;
  category: string;
  message: string;
  level: LogLevel;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface SentryEvent {
  event_id: string;
  timestamp: number;
  level: LogLevel;
  logger: string;
  message?: { formatted: string };
  exception?: {
    values: Array<{
      type: string;
      value: string;
      stacktrace?: { frames: Array<{ filename: string; lineno: number; function: string }> };
    }>;
  };
  tags: Record<string, string>;
  contexts: Record<string, unknown>;
  breadcrumbs?: { values: SentryBreadcrumb[] };
  environment: string;
  platform: string;
}

/**
 * Sanitize sensitive data before logging
 */
function sanitizeData(data: unknown, seen = new WeakSet()): unknown {
  if (!data || typeof data !== "object") return data;
  
  if (seen.has(data as object)) {
    return "[Circular Reference]";
  }
  
  seen.add(data as object);
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, seen));
  }
  
  const sensitiveFields = ["email", "password", "token", "api_key", "apikey", "secret", "authorization"];
  const sanitized: Record<string, unknown> = {};
  
  try {
    for (const key in data as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = (data as Record<string, unknown>)[key];
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
          sanitized[key] = sanitizeData(value, seen);
        } else {
          sanitized[key] = value;
        }
      }
    }
  } catch {
    return "[Sanitization Error]";
  }
  
  return sanitized;
}

/**
 * Generate a UUID for Sentry event_id
 */
function generateEventId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Build Sentry envelope from events
 */
function buildSentryEnvelope(events: LogEvent[], requestId: string, userId?: string): string {
  const dsn = new URL(SENTRY_DSN);
  const projectId = dsn.pathname.replace("/", "");
  const publicKey = dsn.username;
  
  // Create breadcrumbs from info/debug events
  const breadcrumbs: SentryBreadcrumb[] = events
    .filter(e => e.level === "debug" || e.level === "info")
    .map(e => ({
      type: "default",
      category: e.category,
      message: e.message,
      level: e.level,
      timestamp: e.timestamp / 1000, // Sentry uses seconds
      data: e.data as Record<string, unknown> | undefined,
    }));
  
  // Find error events
  const errorEvents = events.filter(e => e.level === "error" || e.level === "fatal" || e.level === "warning");
  
  // Calculate performance metrics
  const startTime = Math.min(...events.map(e => e.timestamp));
  const endTime = Math.max(...events.map(e => e.timestamp));
  const totalDuration = endTime - startTime;
  
  const toolEvents = events.filter(e => e.category === "tool_execution");
  const azureEvents = events.filter(e => e.category === "azure_openai");
  const totalTokens = azureEvents.reduce((sum, e) => sum + (e.tokens_used || 0), 0);
  
  const envelopeItems: string[] = [];
  
  // Envelope header
  const envelopeHeader = JSON.stringify({
    event_id: generateEventId(),
    sent_at: new Date().toISOString(),
    dsn: SENTRY_DSN,
  });
  envelopeItems.push(envelopeHeader);
  
  // If we have errors, send an error event
  if (errorEvents.length > 0) {
    const mainError = errorEvents[0];
    const eventPayload: SentryEvent = {
      event_id: generateEventId(),
      timestamp: mainError.timestamp / 1000,
      level: mainError.level,
      logger: "planner-chat",
      message: { formatted: mainError.message },
      tags: {
        request_id: requestId,
        category: mainError.category,
        ...(mainError.tool_name && { tool_name: mainError.tool_name }),
      },
      contexts: {
        request: {
          request_id: requestId,
          user_id: userId || "anonymous",
          duration_ms: totalDuration,
          total_tokens: totalTokens,
        },
        tools: {
          tools_called: toolEvents.map(t => t.tool_name).filter(Boolean),
          tools_count: toolEvents.length,
        },
        custom: sanitizeData(mainError.data) as Record<string, unknown>,
      },
      breadcrumbs: { values: breadcrumbs },
      environment: Deno.env.get("DENO_ENV") || "production",
      platform: "javascript",
    };
    
    const itemHeader = JSON.stringify({ type: "event" });
    envelopeItems.push(itemHeader);
    envelopeItems.push(JSON.stringify(eventPayload));
  } else {
    // Send as a transaction/info event for observability
    const eventPayload: SentryEvent = {
      event_id: generateEventId(),
      timestamp: endTime / 1000,
      level: "info",
      logger: "planner-chat",
      message: { formatted: `Request completed: ${requestId}` },
      tags: {
        request_id: requestId,
        category: "planner_chat",
      },
      contexts: {
        request: {
          request_id: requestId,
          user_id: userId || "anonymous",
          duration_ms: totalDuration,
          total_tokens: totalTokens,
        },
        tools: {
          tools_called: toolEvents.map(t => t.tool_name).filter(Boolean),
          tools_count: toolEvents.length,
        },
        performance: {
          total_duration_ms: totalDuration,
          tool_latencies: toolEvents.map(t => ({
            tool: t.tool_name,
            latency_ms: t.latency_ms,
          })),
        },
      },
      breadcrumbs: { values: breadcrumbs },
      environment: Deno.env.get("DENO_ENV") || "production",
      platform: "javascript",
    };
    
    const itemHeader = JSON.stringify({ type: "event" });
    envelopeItems.push(itemHeader);
    envelopeItems.push(JSON.stringify(eventPayload));
  }
  
  return envelopeItems.join("\n");
}

/**
 * Send envelope to Sentry via tunnel
 */
async function sendToSentry(envelope: string): Promise<void> {
  try {
    const response = await fetch(SENTRY_TUNNEL_URL, {
      method: "POST",
      body: envelope,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
    });
    
    if (!response.ok) {
      console.error("[Logger] Failed to send to Sentry:", response.status);
    }
  } catch (error) {
    console.error("[Logger] Error sending to Sentry:", error);
  }
}

export interface RequestLogger {
  debug: (category: LogCategory, message: string, data?: Record<string, unknown>) => void;
  info: (category: LogCategory, message: string, data?: Record<string, unknown>) => void;
  warn: (category: LogCategory, message: string, data?: Record<string, unknown>) => void;
  error: (category: LogCategory, message: string, error?: Error | null, data?: Record<string, unknown>) => void;
  toolStart: (toolName: string) => void;
  toolEnd: (toolName: string, success: boolean, latencyMs: number, result?: unknown) => void;
  azureCall: (type: "start" | "end", latencyMs?: number, tokens?: number) => void;
  flush: () => Promise<void>;
  getRequestId: () => string;
}

/**
 * Create a request-scoped logger
 * 
 * @param requestId - Unique ID for this request (from frontend or generated)
 * @param userId - User ID if authenticated
 * @returns Logger instance with all methods
 */
export function createRequestLogger(requestId: string, userId?: string): RequestLogger {
  const events: LogEvent[] = [];
  const startTime = Date.now();
  let azureCallStartTime: number | null = null;
  
  const addEvent = (event: Omit<LogEvent, "request_id" | "timestamp" | "user_id">) => {
    const fullEvent: LogEvent = {
      ...event,
      request_id: requestId,
      timestamp: Date.now(),
      user_id: userId,
    };
    events.push(fullEvent);
    
    // Also log to console for Supabase logs
    const logData = {
      request_id: requestId,
      ...event,
      ...(event.data && { data: sanitizeData(event.data) }),
    };
    
    switch (event.level) {
      case "debug":
        console.debug(JSON.stringify(logData));
        break;
      case "info":
        console.log(JSON.stringify(logData));
        break;
      case "warning":
        console.warn(JSON.stringify(logData));
        break;
      case "error":
      case "fatal":
        console.error(JSON.stringify(logData));
        break;
    }
  };
  
  return {
    debug(category: LogCategory, message: string, data?: Record<string, unknown>) {
      addEvent({ level: "debug", category, message, data });
    },
    
    info(category: LogCategory, message: string, data?: Record<string, unknown>) {
      addEvent({ level: "info", category, message, data });
    },
    
    warn(category: LogCategory, message: string, data?: Record<string, unknown>) {
      addEvent({ level: "warning", category, message, data });
    },
    
    error(category: LogCategory, message: string, error?: Error | null, data?: Record<string, unknown>) {
      addEvent({
        level: "error",
        category,
        message,
        data: {
          ...data,
          ...(error && {
            error_message: error.message,
            error_name: error.name,
            error_stack: error.stack,
          }),
        },
      });
    },
    
    toolStart(toolName: string) {
      addEvent({
        level: "debug",
        category: "tool_execution",
        message: `Tool started: ${toolName}`,
        tool_name: toolName,
      });
    },
    
    toolEnd(toolName: string, success: boolean, latencyMs: number, result?: unknown) {
      addEvent({
        level: success ? "info" : "warning",
        category: "tool_execution",
        message: `Tool ${success ? "completed" : "failed"}: ${toolName}`,
        tool_name: toolName,
        latency_ms: latencyMs,
        data: result ? { result_preview: typeof result === "string" ? result.slice(0, 200) : "[object]" } : undefined,
      });
    },
    
    azureCall(type: "start" | "end", latencyMs?: number, tokens?: number) {
      if (type === "start") {
        azureCallStartTime = Date.now();
        addEvent({
          level: "debug",
          category: "azure_openai",
          message: "Azure OpenAI call started",
        });
      } else {
        const calculatedLatency = azureCallStartTime ? Date.now() - azureCallStartTime : latencyMs;
        addEvent({
          level: "info",
          category: "azure_openai",
          message: "Azure OpenAI call completed",
          latency_ms: calculatedLatency,
          tokens_used: tokens,
          data: tokens ? { tokens_used: tokens } : undefined,
        });
        azureCallStartTime = null;
      }
    },
    
    async flush(): Promise<void> {
      if (events.length === 0) return;
      
      // Add final summary event
      const totalDuration = Date.now() - startTime;
      addEvent({
        level: "info",
        category: "request",
        message: `Request completed in ${totalDuration}ms`,
        latency_ms: totalDuration,
        data: {
          events_count: events.length,
          tools_called: events.filter(e => e.category === "tool_execution" && e.tool_name).map(e => e.tool_name),
        },
      });
      
      // Build and send to Sentry
      const envelope = buildSentryEnvelope(events, requestId, userId);
      await sendToSentry(envelope);
    },
    
    getRequestId(): string {
      return requestId;
    },
  };
}

/**
 * Extract request ID from headers or body, or generate a new one
 */
export function extractRequestId(req: Request, body?: { requestId?: string }): string {
  // Try header first
  const headerRequestId = req.headers.get("X-Request-ID");
  if (headerRequestId) return headerRequestId;
  
  // Try body
  if (body?.requestId) return body.requestId;
  
  // Generate new
  return crypto.randomUUID();
}
