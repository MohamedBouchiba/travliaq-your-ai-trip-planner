/**
 * IP geolocation client.
 *
 * Calls the `ip-geolocation` edge function instead of a third-party API
 * directly (avoids CORS failures and per-browser rate limiting).
 * Results are de-duplicated in-flight and cached in localStorage.
 */
import { supabase } from "@/integrations/supabase/client";

export interface IpGeolocation {
  city?: string;
  region?: string;
  country_code?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  currency?: string;
}

const CACHE_KEY = "travliaq_ip_geo_v1";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

let inFlight: Promise<IpGeolocation | null> | null = null;

function readCache(): IpGeolocation | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: IpGeolocation; ts: number };
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: IpGeolocation): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // storage full / unavailable — non blocking
  }
}

/**
 * Returns the approximate location of the current visitor, or null when
 * unavailable. Never throws.
 */
export async function getIpGeolocation(): Promise<IpGeolocation | null> {
  const cached = readCache();
  if (cached) return cached;

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("ip-geolocation");
      if (error) {
        console.warn("[ipGeolocation] lookup failed:", error.message);
        return null;
      }
      const result = data as IpGeolocation | null;
      if (!result || !result.country_code) return null;
      writeCache(result);
      return result;
    } catch (err) {
      console.warn("[ipGeolocation] unexpected error:", err);
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
