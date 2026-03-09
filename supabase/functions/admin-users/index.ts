import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { action, ...params } = await req.json();

    // Bootstrap: allow creating first admin if no admins exist
    if (action === "bootstrap") {
      const { data: existingAdmins } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);
      if (existingAdmins && existingAdmins.length > 0) {
        throw new Error("Un admin esiste già. Usa il login.");
      }
      const { email, password, full_name } = params;
      if (!email || !password) throw new Error("Email e password obbligatorie");
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });
      if (createErr) throw createErr;
      await supabaseAdmin.from("user_roles").insert({ user_id: newUser.user.id, role: "admin" });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is admin for all other actions
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Non autenticato");

    const { data: callerRole } = await supabaseAdmin.rpc("get_user_role", { _user_id: caller.id });
    if (callerRole !== "admin") throw new Error("Non autorizzato");

    if (action === "create_user") {
      const { email, password, full_name, role } = params;
      if (!email || !password || !role) throw new Error("Email, password e ruolo sono obbligatori");

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });
      if (createErr) throw createErr;

      // Assign role
      const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
        user_id: newUser.user.id,
        role,
      });
      if (roleErr) throw roleErr;

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_password") {
      const { user_id, password } = params;
      if (!user_id || !password) throw new Error("user_id e password sono obbligatori");

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_active") {
      const { user_id, is_active } = params;
      if (!user_id) throw new Error("user_id è obbligatorio");

      // Update profile
      const { error: profileErr } = await supabaseAdmin.from("profiles").update({ is_active }).eq("id", user_id);
      if (profileErr) throw profileErr;

      // Ban/unban in auth
      if (!is_active) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
      } else {
        await supabaseAdmin.auth.admin.updateUserById(user_id, { ban_duration: "none" });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_role") {
      const { user_id, role } = params;
      if (!user_id || !role) throw new Error("user_id e role sono obbligatori");

      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await supabaseAdmin.from("user_roles").insert({ user_id, role });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "remove_role") {
      const { user_id } = params;
      if (!user_id) throw new Error("user_id è obbligatorio");

      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "link_persona") {
      const { user_id, persona_id } = params;
      if (!user_id || !persona_id) throw new Error("user_id e persona_id sono obbligatori");

      // Remove any existing link for this user
      await supabaseAdmin.from("persone").update({ user_id: null }).eq("user_id", user_id);
      // Link persona to user
      const { error } = await supabaseAdmin.from("persone").update({ user_id }).eq("id", persona_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "unlink_persona") {
      const { user_id } = params;
      if (!user_id) throw new Error("user_id è obbligatorio");

      const { error } = await supabaseAdmin.from("persone").update({ user_id: null }).eq("user_id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Azione non supportata: ${action}`);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
