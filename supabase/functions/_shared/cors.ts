// Browser-invoked functions (create-checkout-session, customer-portal-session)
// need this; stripe-webhook is server-to-server and doesn't.
// The real security boundary on these functions is the Supabase auth JWT
// they require, not CORS — so this stays permissive rather than breaking
// `supabase functions serve` on localhost during development.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
