/**
 * Simple in-memory rate limiter for edge functions.
 * Uses IP-based rate limiting to prevent abuse.
 */

// In-memory rate limit storage (per edge function instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a request is within rate limits
 * @param ip - Client IP address
 * @param maxRequests - Maximum requests allowed per hour
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(ip: string, maxRequests: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 3600000 }); // 1 hour
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Get client IP from request headers
 * @param req - Incoming request
 * @returns Client IP address or 'unknown'
 */
export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

/**
 * Clean up expired rate limit entries to prevent memory leaks
 * Call this occasionally (e.g., 1% of requests)
 */
export function cleanupRateLimitMap(): void {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    { 
      status: 429, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': '3600'
      } 
    }
  );
}
