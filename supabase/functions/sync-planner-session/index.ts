import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SessionPayload {
  chatSessionId: string;
  flightMemory?: Record<string, unknown>;
  accommodationMemory?: Record<string, unknown>;
  travelMemory?: Record<string, unknown>;
  chatMessages?: unknown[];
  title?: string;
  preview?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("[sync-planner-session] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);

    // DELETE - Remove a session
    if (req.method === "DELETE") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Missing sessionId parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[sync-planner-session] DELETE session ${sessionId} for user ${user.id}`);

      const { error } = await supabase
        .from("planner_sessions")
        .delete()
        .eq("chat_session_id", sessionId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[sync-planner-session] Delete error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET - Fetch session(s)
    if (req.method === "GET") {
      const sessionId = url.searchParams.get("sessionId");

      if (sessionId) {
        // Get specific session
        console.log(`[sync-planner-session] GET session ${sessionId} for user ${user.id}`);
        const { data, error } = await supabase
          .from("planner_sessions")
          .select("*")
          .eq("chat_session_id", sessionId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("[sync-planner-session] Get error:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ session: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Get all sessions for user
        console.log(`[sync-planner-session] GET all sessions for user ${user.id}`);
        const { data, error } = await supabase
          .from("planner_sessions")
          .select("id, chat_session_id, title, preview, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (error) {
          console.error("[sync-planner-session] List error:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ sessions: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // POST - Upsert session
    if (req.method === "POST") {
      const body: SessionPayload = await req.json();

      if (!body.chatSessionId) {
        return new Response(
          JSON.stringify({ error: "Missing chatSessionId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[sync-planner-session] UPSERT session ${body.chatSessionId} for user ${user.id}`);

      const { data, error } = await supabase
        .from("planner_sessions")
        .upsert(
          {
            user_id: user.id,
            chat_session_id: body.chatSessionId,
            flight_memory: body.flightMemory || {},
            accommodation_memory: body.accommodationMemory || {},
            travel_memory: body.travelMemory || {},
            chat_messages: body.chatMessages || [],
            title: body.title || "Nouvelle conversation",
            preview: body.preview || "Démarrez la conversation...",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,chat_session_id",
          }
        )
        .select()
        .single();

      if (error) {
        console.error("[sync-planner-session] Upsert error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ session: data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[sync-planner-session] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
