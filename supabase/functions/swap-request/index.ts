import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { mySlotId, theirSlotId } = await req.json();
    if (!mySlotId || !theirSlotId) {
      return new Response(
        JSON.stringify({ error: "Missing mySlotId or theirSlotId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: mySlot, error: mySlotError } = await supabase
      .from("events")
      .select("*")
      .eq("id", mySlotId)
      .maybeSingle();

    const { data: theirSlot, error: theirSlotError } = await supabase
      .from("events")
      .select("*")
      .eq("id", theirSlotId)
      .maybeSingle();

    if (!mySlot || !theirSlot) {
      return new Response(
        JSON.stringify({ error: "One or both slots not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (mySlot.user_id !== userData.user.id) {
      return new Response(
        JSON.stringify({ error: "You don't own mySlot" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (mySlot.status !== "SWAPPABLE" || theirSlot.status !== "SWAPPABLE") {
      return new Response(
        JSON.stringify({ error: "Both slots must be SWAPPABLE" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: swapRequest, error: insertError } = await supabase
      .from("swap_requests")
      .insert({
        requester_id: userData.user.id,
        requester_slot_id: mySlotId,
        owner_id: theirSlot.user_id,
        owner_slot_id: theirSlotId,
        status: "PENDING",
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    await supabase
      .from("events")
      .update({ status: "SWAP_PENDING" })
      .eq("id", mySlotId);

    await supabase
      .from("events")
      .update({ status: "SWAP_PENDING" })
      .eq("id", theirSlotId);

    return new Response(
      JSON.stringify({ success: true, data: swapRequest }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
