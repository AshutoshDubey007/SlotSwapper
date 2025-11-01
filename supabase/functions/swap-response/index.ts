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

    const { requestId, accept } = await req.json();
    if (!requestId || accept === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing requestId or accept" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: swapRequest, error: fetchError } = await supabase
      .from("swap_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (fetchError || !swapRequest) {
      return new Response(
        JSON.stringify({ error: "Swap request not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (swapRequest.owner_id !== userData.user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to respond to this request" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (accept) {
      const { data: requesterSlot, error: reqSlotError } = await supabase
        .from("events")
        .select("*")
        .eq("id", swapRequest.requester_slot_id)
        .maybeSingle();

      const { data: ownerSlot, error: ownerSlotError } = await supabase
        .from("events")
        .select("*")
        .eq("id", swapRequest.owner_slot_id)
        .maybeSingle();

      if (!requesterSlot || !ownerSlot) {
        return new Response(
          JSON.stringify({ error: "Slots not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      await supabase
        .from("events")
        .update({ user_id: swapRequest.owner_id, status: "BUSY" })
        .eq("id", swapRequest.requester_slot_id);

      await supabase
        .from("events")
        .update({ user_id: swapRequest.requester_id, status: "BUSY" })
        .eq("id", swapRequest.owner_slot_id);

      await supabase
        .from("swap_requests")
        .update({ status: "ACCEPTED" })
        .eq("id", requestId);
    } else {
      await supabase
        .from("events")
        .update({ status: "SWAPPABLE" })
        .eq("id", swapRequest.requester_slot_id);

      await supabase
        .from("events")
        .update({ status: "SWAPPABLE" })
        .eq("id", swapRequest.owner_slot_id);

      await supabase
        .from("swap_requests")
        .update({ status: "REJECTED" })
        .eq("id", requestId);
    }

    return new Response(
      JSON.stringify({ success: true, message: accept ? "Swap accepted" : "Swap rejected" }),
      {
        status: 200,
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
