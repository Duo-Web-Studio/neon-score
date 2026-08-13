import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body?.user_id ?? "");
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (targetUserId === callerId) {
      return new Response(JSON.stringify({ error: "Você não pode excluir a si mesmo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Activities
    await admin.from("activities").delete().eq("user_id", targetUserId);

    // 2. Deals (owned or closed by user)
    await admin.from("deals").delete().eq("user_id", targetUserId);
    await admin.from("deals").delete().eq("closed_by_user_id", targetUserId);

    // 3. Clients created by user
    await admin.from("clients").delete().eq("created_by", targetUserId);

    // 4. Goals (targeted at or created by user)
    await admin.from("goals").delete().eq("target_user_id", targetUserId);
    await admin.from("goals").delete().eq("created_by", targetUserId);

    // 5. Commission periods
    await admin.from("commission_periods").delete().eq("user_id", targetUserId);

    // 6. Commission rate overrides (per-user only)
    await admin.from("commission_rates").delete().eq("user_id", targetUserId);

    // 7-8. Null out created_by on shared resources
    await admin.from("pipeline_stages").update({ created_by: null }).eq("created_by", targetUserId);
    await admin.from("sections").update({ created_by: null }).eq("created_by", targetUserId);

    // 9. Roles
    await admin.from("user_roles").delete().eq("user_id", targetUserId);

    // 10. Profile
    await admin.from("profiles").delete().eq("id", targetUserId);

    // 11. Avatar files in storage
    try {
      const { data: files } = await admin.storage.from("avatars").list(targetUserId);
      if (files && files.length > 0) {
        const paths = files.map((f) => `${targetUserId}/${f.name}`);
        await admin.storage.from("avatars").remove(paths);
      }
    } catch (_) {
      // ignore storage errors
    }

    // 12. Auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
