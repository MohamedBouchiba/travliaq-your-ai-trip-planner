import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";

export class AuthExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "AuthExpiredError";
  }
}

export class EdgeFunctionError extends Error {
  statusCode: number;
  constructor(functionName: string, statusCode: number) {
    super(`Edge Function ${functionName} responded ${statusCode}`);
    this.name = "EdgeFunctionError";
    this.statusCode = statusCode;
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
    throw new EdgeFunctionError(functionName, response.status);
  }

  return response;
}
