// Creates a Stripe Billing Portal session so a parent can manage/cancel
// their household's subscription without any custom billing UI. See
// docs/subscription-billing-architecture.md for the full design.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://www.littleloops.xyz";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: household, error: householdError } = await supabase
      .from("households")
      .select("stripe_customer_id")
      .single();

    if (householdError || !household?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "This household has no subscription yet" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: household.stripe_customer_id,
      return_url: `${APP_BASE_URL}/parent/schedules`,
    });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("customer-portal-session error:", error);
    return new Response(JSON.stringify({ error: "Could not open billing portal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
