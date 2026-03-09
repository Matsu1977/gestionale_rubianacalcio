import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
  });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature) {
    return new Response(
      JSON.stringify({ error: "No signature" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For testing without webhook secret
      event = JSON.parse(body);
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return new Response(
      JSON.stringify({ error: "Invalid signature" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const rataId = session.metadata?.rata_id;
    const personaId = session.metadata?.persona_id;
    const abbonamentoId = session.metadata?.abbonamento_id;

    if (!rataId || !personaId || !abbonamentoId) {
      console.error("Missing metadata in session:", session.id);
      return new Response(
        JSON.stringify({ error: "Missing metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get rata details
    const { data: rata, error: rataError } = await supabaseAdmin
      .from("rate")
      .select("*, abbonamento:abbonamenti(*)")
      .eq("id", rataId)
      .single();

    if (rataError || !rata) {
      console.error("Rata not found:", rataId);
      return new Response(
        JSON.stringify({ error: "Rata not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update rata status
    const { error: updateRataError } = await supabaseAdmin
      .from("rate")
      .update({ stato: "Pagata" })
      .eq("id", rataId);

    if (updateRataError) {
      console.error("Error updating rata:", updateRataError);
      return new Response(
        JSON.stringify({ error: "Error updating rata" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create movimento (accounting entry)
    const { error: movimentoError } = await supabaseAdmin
      .from("movimenti")
      .insert({
        tipo: "Entrata",
        categoria: "Abbonamento",
        importo: rata.importo,
        persona_id: personaId,
        metodo_pagamento: "Carta",
        riferimento_tipo: "abbonamento",
        riferimento_id: abbonamentoId,
        note: `Pagamento online rata ${rata.numero_rata} - ${rata.abbonamento?.corso}`,
        data: new Date().toISOString().split("T")[0],
      });

    if (movimentoError) {
      console.error("Error creating movimento:", movimentoError);
    }

    // Check if all rate are paid and update abbonamento status
    const { data: allRate } = await supabaseAdmin
      .from("rate")
      .select("stato")
      .eq("abbonamento_id", abbonamentoId);

    if (allRate) {
      const allPaid = allRate.every((r) => r.stato === "Pagata");
      const somePaid = allRate.some((r) => r.stato === "Pagata");
      
      let newStatus = "Non pagato";
      if (allPaid) {
        newStatus = "Pagato";
      } else if (somePaid) {
        newStatus = "Parziale";
      }

      await supabaseAdmin
        .from("abbonamenti")
        .update({ stato_pagamento: newStatus })
        .eq("id", abbonamentoId);
    }

    console.log("Payment processed successfully for rata:", rataId);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
