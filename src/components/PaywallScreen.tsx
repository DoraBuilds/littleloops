import { useState } from 'react';
import type { BillingPlan } from '@/lib/billing/subscription-client';
import { openBillingPortal, startCheckout } from '@/lib/billing/subscription-client';
import type { SubscriptionStatus } from '@/lib/data/models';

interface PaywallScreenProps {
  subscriptionStatus: SubscriptionStatus;
  onSignOut: () => void;
}

const T = {
  fonts: `'Fredoka', system-ui, sans-serif`,
  ink: '#3d2c1f',
  inkMute: '#8a7866',
  cream: '#fff9f0',
  white: '#ffffff',
  border: 'rgba(180,120,80,0.10)',
  orange: '#f97316',
  orangeLight: '#fff1e8',
};

const PLANS: { key: BillingPlan; label: string; price: string; sub: string; badge?: string }[] = [
  { key: 'monthly', label: 'Monthly', price: '€6.99', sub: 'per month' },
  { key: 'annual', label: 'Annual', price: '€70', sub: 'per year', badge: 'Save ~17%' },
];

export const PaywallScreen = ({ subscriptionStatus, onSignOut }: PaywallScreenProps) => {
  const [plan, setPlan] = useState<BillingPlan>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setLoading(true);
    setError(null);
    const { url, error: checkoutError } = await startCheckout(plan);
    if (url) {
      window.location.assign(url);
      return;
    }
    setError(checkoutError ?? 'Could not start checkout.');
    setLoading(false);
  };

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);
    const { url, error: portalError } = await openBillingPortal();
    if (url) {
      window.location.assign(url);
      return;
    }
    setError(portalError ?? 'Could not open billing management.');
    setLoading(false);
  };

  return (
    <div
      data-testid="paywall-screen"
      style={{
        minHeight: '100svh',
        background: T.cream,
        fontFamily: T.fonts,
        color: T.ink,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'fixed', top: -80, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -60, left: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(139,92,246,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 460, width: '100%' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.orangeLight, borderRadius: 99, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: T.orange, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 18 }}>
          ⭐ {subscriptionStatus === 'past_due' ? 'Payment needs attention' : subscriptionStatus === 'canceled' ? 'Subscription ended' : 'Subscribe to continue'}
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2, margin: '0 0 12px' }}>
          {subscriptionStatus === 'past_due' ? "Your last payment didn't go through" : 'Little Loops runs on a subscription'}
        </h1>
        <p style={{ fontSize: 14, color: T.inkMute, marginBottom: 24, lineHeight: 1.6 }}>
          {subscriptionStatus === 'past_due'
            ? 'Update your card to keep full access to routines, mood tracking, affirmations, and awards.'
            : 'Full access to routines, mood tracking, affirmations, and awards for your whole household — cancel anytime.'}
        </p>

        {subscriptionStatus === 'past_due' ? (
          <button
            onClick={() => void handleManageBilling()}
            disabled={loading}
            style={{
              width: '100%',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              padding: '14px 24px',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {loading ? 'Opening…' : 'Update payment method'}
          </button>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlan(p.key)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    borderRadius: 18,
                    padding: '14px 16px',
                    border: plan === p.key ? `2.5px solid ${T.orange}` : `1.5px solid ${T.border}`,
                    background: plan === p.key ? T.orangeLight : T.white,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: T.ink,
                    position: 'relative',
                  }}
                >
                  {p.badge && (
                    <div style={{ position: 'absolute', top: -10, right: 10, background: T.orange, color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                      {p.badge}
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMute, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{p.price}</div>
                  <div style={{ fontSize: 12, color: T.inkMute }}>{p.sub}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => void handleSubscribe()}
              disabled={loading}
              style={{
                width: '100%',
                background: T.orange,
                color: '#fff',
                border: 'none',
                borderRadius: 16,
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 3px 0 rgba(194,65,12,0.35)',
              }}
            >
              {loading ? 'Loading…' : `Subscribe — ${PLANS.find((p) => p.key === plan)?.price}`}
            </button>
          </>
        )}

        {error && (
          <div style={{ marginTop: 12, fontSize: 13, color: '#dc2626' }}>⚠️ {error}</div>
        )}

        <button
          onClick={onSignOut}
          style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', color: T.inkMute, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
};
