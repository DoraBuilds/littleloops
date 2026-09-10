import { getSupabaseClient } from '@/lib/supabase/client';

// supabase.functions.invoke attaches the current session's access token
// automatically, which is what create-checkout-session/customer-portal-session
// use to resolve the caller's household via RLS — see
// docs/subscription-billing-architecture.md.
const invokeForUrl = async (functionName: 'create-checkout-session' | 'customer-portal-session') => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { url: null, error: 'Supabase is not configured yet.' };
  }

  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(functionName);

  if (error) {
    return { url: null, error: error.message };
  }
  if (!data?.url) {
    return { url: null, error: data?.error ?? 'Something went wrong. Please try again.' };
  }

  return { url: data.url, error: null };
};

export const startCheckout = () => invokeForUrl('create-checkout-session');
export const openBillingPortal = () => invokeForUrl('customer-portal-session');
