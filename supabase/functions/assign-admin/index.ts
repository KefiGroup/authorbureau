import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

if (Deno.env.get("ENVIRONMENT") === "development") {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const { email } = await req.json();

      if (!email) {
        return new Response(JSON.stringify({ error: "Email required" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const supabaseUrl = Deno.env.get("SUPABASE_URL");

      const supabase = createClient(supabaseUrl, serviceRoleKey);

      // Get user by email
      const { data: users, error: userError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (userError) throw userError;

      // Try to find the auth user (using admin API)
      const { data, error } = await supabase.auth.admin.listUsers();

      if (error) throw error;

      const user = data.users.find((u) => u.email === email);
      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      // Add admin role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: user.id,
        role: "admin",
      });

      if (roleError) {
        if (roleError.code === "23505") {
          return new Response(JSON.stringify({ message: "User already has admin role" }), {
            status: 200,
            headers: corsHeaders,
          });
        }
        throw roleError;
      }

      return new Response(JSON.stringify({ message: "Admin role assigned", userId: user.id }), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  });
}
