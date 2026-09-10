// Receives Stripe subscription lifecycle events and syncs
// households.subscription_status. Runs with the service-role key, which is
// the one path the protect_subscription_columns trigger (see
// supabase/migrations/20260910120000_add_subscription_fields.sql) allows
// to write these columns. See docs/subscription-billing-architecture.md.
//
// Deployed with --no-verify-jwt (see supabase/config.toml) since Stripe
// calls this directly, not through a Supabase-authenticated session — the
// Stripe signature check below is what authenticates the caller instead.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.103.0";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Maps Stripe's subscription statuses onto our narrower DB check
// constraint. unpaid/paused both mean "not currently delivering value but
// not yet cancelled" — same bucket as past_due for UI purposes.
// incomplete_expired means checkout was started but never completed/paid,
// which we treat the same as never having subscribed.
function mapStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
      return "incomplete";
    default:
      return "incomplete";
  }
}

async function upsertFromSubscription(subscription: Stripe.Subscription) {
  const householdId = subscription.metadata?.household_id;
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  // A canceled/ended subscription has no current billing period, so Stripe
  // omits current_period_end from the payload entirely (confirmed via a
  // live customer.subscription.deleted event, which was silently crashing
  // this handler with "Invalid time value" before this null check existed).
  const update = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: mapStatus(subscription.status),
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  };

  // Prefer the household_id we stamped into subscription metadata at
  // checkout time; fall back to matching on stripe_customer_id so this
  // still self-heals if that metadata is ever missing on an event.
  const query = householdId
    ? supabase.from("households").update(update).eq("id", householdId)
    : supabase.from("households").update(update).eq("stripe_customer_id", customerId);

  const { error, count } = await query.select("id", { count: "exact" });
  if (error) throw error;
  if (!count) {
    console.error(
      `stripe-webhook: no household matched for subscription ${subscription.id} (household_id=${householdId}, customer=${customerId})`,
    );
  }
}

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  if (!signature) {
    return new Response("Missing Stripe-Signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (error) {
    console.error("stripe-webhook: signature verification failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertFromSubscription(subscription);
        break;
      }
      default:
        // Other event types aren't relevant to entitlement — ignored.
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`stripe-webhook: failed handling ${event.type}:`, error);
    // Non-2xx makes Stripe retry with backoff — correct here, since a
    // transient DB error shouldn't silently drop an entitlement update.
    return new Response(JSON.stringify({ error: "Webhook handler failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
