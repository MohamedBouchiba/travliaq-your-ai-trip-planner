/**
 * Persistent rate limiter using Supabase rate_limits table.
 * Survives edge function cold starts, unlike the previous in-memory Map.
 * 
 * Uses UPSERT for atomic increment and window reset.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if a request is within rate limits.
 * Uses UPSERT with a 1-hour sliding window.
 * 
 * @param ip - Client IP address
 * @param maxRequests - Maximum requests allowed per hour
 * @param functionName - Edge function name (for per-function limits)
 * @returns true if request is allowed, false if rate limited
 */
export async function checkRateLimit(
  ip: string,
  maxRequests: number,
  functionName: string = "default"
): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 3600000); // 1 hour ago

  try {
    // First, try to get the existing record
    const { data: existing } = await supabase
      .from("rate_limits")
      .select("request_count, window_start")
      .eq("ip", ip)
      .eq("function_name", functionName)
      .maybeSingle();

    if (!existing || new Date(existing.window_start) < windowStart) {
      // No record or expired window — reset
      await supabase
        .from("rate_limits")
        .upsert(
          { ip, function_name: functionName, request_count: 1, window_start: now.toISOString() },
          { onConflict: "ip,function_name" }
        );
      return true;
    }

    if (existing.request_count >= maxRequests) {
      return false;
    }

    // Increment
    await supabase
      .from("rate_limits")
      .update({ request_count: existing.request_count + 1 })
      .eq("ip", ip)
      .eq("function_name", functionName);

    return true;
  } catch (error) {
    // On DB error, fail open (allow request) to avoid blocking legitimate users
    console.error("[RateLimit] DB error, failing open:", error);
    return true;
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

/**
 * Clean up expired rate limit entries (call occasionally, e.g. 1% of requests)
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    await supabase.rpc("cleanup_rate_limits");
  } catch (error) {
    console.error("[RateLimit] Cleanup error:", error);
  }
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "3600",
      },
    }
  );
}
