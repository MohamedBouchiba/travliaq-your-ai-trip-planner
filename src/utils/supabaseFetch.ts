import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export class AuthExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "AuthExpiredError";
  }
}

/** Fetch a Supabase Edge Function with auth + response.ok check.
 *  If `authOptional` is true, the request proceeds even without a session. */
export async function supabaseFetch(
  functionName: string,
  init?: RequestInit & { params?: Record<string, string>; authOptional?: boolean },
): Promise<Response> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token && !init?.authOptional) throw new AuthExpiredError();

  const url = new URL(`${SUPABASE_URL}/functions/v1/${functionName}`);
  if (init?.params) {
    for (const [k, v] of Object.entries(init.params)) {
      url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SUPABASE_PUBLISHABLE_KEY,
    ...((init?.headers as Record<string, string>) ?? {}),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Edge Function ${functionName} responded ${response.status}`);
  }

  return response;
}
