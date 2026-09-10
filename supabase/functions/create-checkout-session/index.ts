// Creates a Stripe Checkout Session for the caller's household and returns
// its URL for the client to redirect to. See
// docs/subscription-billing-architecture.md for the full design.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import Stripe from "https://esm.sh/stripe@17?target=deno";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const PRICE_IDS = {
  monthly: Deno.env.get("STRIPE_PRICE_ID_MONTHLY")!,
  annual: Deno.env.get("STRIPE_PRICE_ID_ANNUAL")!,
} as const;
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

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === "annual" ? "annual" : "monthly";
    const priceId = PRICE_IDS[plan];

    // Scoped to the caller's own JWT so RLS decides which household they
    // can see — the household id is never trusted from the request body.
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
      .select("id, stripe_customer_id")
      .single();

    if (householdError || !household) {
      return new Response(JSON.stringify({ error: "No household found for this account" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: household.id,
      subscription_data: { metadata: { household_id: household.id } },
      metadata: { household_id: household.id },
      success_url: `${APP_BASE_URL}/parent/schedules?checkout=success`,
      cancel_url: `${APP_BASE_URL}/parent/schedules?checkout=cancelled`,
      // Shows a "Add promotion code" field at checkout — used for
      // friends & family 100%-off codes (see Stripe dashboard > Coupons).
      allow_promotion_codes: true,
    };

    let session: Stripe.Checkout.Session;
    try {
      // Reuse the existing Stripe customer if this household subscribed
      // before (e.g. resubscribing after cancellation); otherwise let
      // Stripe create one and prefill the account email.
      session = await stripe.checkout.sessions.create(
        household.stripe_customer_id
          ? { ...baseParams, customer: household.stripe_customer_id }
          : { ...baseParams, customer_email: userData.user.email },
      );
    } catch (error) {
      // A saved customer id can go stale (deleted in Stripe, or — as
      // happened once here — left over from switching test/live API keys,
      // which don't share customer records). Retry as a brand-new
      // customer rather than hard-failing checkout for the whole household.
      const isMissingCustomer =
        error instanceof Stripe.errors.StripeInvalidRequestError &&
        error.code === "resource_missing" &&
        error.param === "customer";
      if (!isMissingCustomer) throw error;

      console.warn(
        `create-checkout-session: stale stripe_customer_id ${household.stripe_customer_id} for household ${household.id}, retrying as a new customer`,
      );
      session = await stripe.checkout.sessions.create({ ...baseParams, customer_email: userData.user.email });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-checkout-session error:", error);
    return new Response(JSON.stringify({ error: "Could not start checkout" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
