import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type H5PEventPayload = {
  user_email?: string;
  user_name?: string;
  module_id?: string;
  module_title?: string;
  content_type?: string;
  event_type?: string;
  question_text?: string;
  answer_given?: string;
  answer_correct?: boolean;
  score?: number;
  max_score?: number;
  duration_seconds?: number;
  raw_xapi?: Record<string, unknown>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  let payload: H5PEventPayload;
  try {
    payload = await req.json();
  } catch (_err) {
    return json({ error: "invalid_json" }, 400);
  }

  const missing = ["user_email", "module_id", "event_type"].filter(
    (field) => !payload[field as keyof H5PEventPayload]
  );
  if (missing.length) {
    return json({ error: "missing_required_fields", fields: missing }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "server_not_configured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("h5p_events").insert({
    user_email: payload.user_email,
    user_name: payload.user_name ?? null,
    module_id: payload.module_id,
    module_title: payload.module_title ?? null,
    content_type: payload.content_type ?? null,
    event_type: payload.event_type,
    question_text: payload.question_text ?? null,
    answer_given: payload.answer_given ?? null,
    answer_correct: payload.answer_correct ?? null,
    score: payload.score ?? null,
    max_score: payload.max_score ?? null,
    duration_seconds: payload.duration_seconds ?? null,
    raw_xapi: payload.raw_xapi ?? null,
  });

  if (error) {
    console.error("Unable to insert H5P event", error);
    return json({ error: "insert_failed" }, 500);
  }

  return json({ ok: true });
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
