import { useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth/use-auth';

type AuthMode = 'signin' | 'signup';

const T = {
  fonts: `'Fredoka', system-ui, sans-serif`,
  ink: '#3d2c1f',
  inkMute: '#8a7866',
  cream: '#fff9f0',
  white: '#ffffff',
  border: 'rgba(180,120,80,0.10)',
  borderStrong: 'rgba(180,120,80,0.20)',
  orange: '#f97316',
  orangeLight: '#fff1e8',
  shadow: '0 4px 14px rgba(180,120,80,0.08)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 14,
  border: `1.5px solid ${T.borderStrong}`,
  background: T.cream,
  fontFamily: T.fonts,
  fontSize: 15,
  fontWeight: 500,
  color: T.ink,
  outline: 'none',
  boxSizing: 'border-box',
  marginTop: 6,
};

export const AccountSettingsCard = () => {
  const {
    configured,
    status,
    user,
    householdStatus,
    household,
    error,
    clearError,
    sendEmailLink,
    retryHousehold,
    signOut,
    deleteAccount,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isCreateMode = mode === 'signup';
  const trimmedEmail = useMemo(() => email.trim(), [email]);
  const trimmedParentName = useMemo(() => parentName.trim(), [parentName]);

  const primaryLabel = isCreateMode ? 'Create account' : 'Send sign-in link';
  const submitLabel = isSubmitting ? 'Sending…' : emailSentTo ? 'Email sent ✓' : primaryLabel;
  const canSubmit =
    !isSubmitting &&
    status !== 'loading' &&
    Boolean(trimmedEmail) &&
    (!isCreateMode || Boolean(trimmedParentName)) &&
    !emailSentTo;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    clearError();
    setValidationError(null);
    setEmailSentTo(null);

    if (isCreateMode && !trimmedParentName) {
      setValidationError('Please enter the parent name before creating the account.');
      setIsSubmitting(false);
      return;
    }

    const ok = await sendEmailLink(
      trimmedEmail,
      mode,
      isCreateMode ? { parentName: trimmedParentName } : undefined
    );
    if (ok) setEmailSentTo(trimmedEmail);
    setIsSubmitting(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    clearError();
    const ok = await deleteAccount();
    if (ok) {
      setEmail('');
      setParentName('');
      setEmailSentTo(null);
      setMode('signin');
      setConfirmDelete(false);
    }
    setIsDeleting(false);
  };

  return (
    <div
      style={{
        background: T.white,
        borderRadius: 26,
        padding: '22px 20px',
        border: `1.5px solid ${T.border}`,
        boxShadow: T.shadow,
        fontFamily: T.fonts,
        color: T.ink,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: T.orangeLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          ☁️
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Parent Account</div>
          <div style={{ fontSize: 12, color: T.inkMute, marginTop: 1 }}>
            {status === 'signed_in'
              ? 'You\'re signed in and your family data is synced.'
              : 'Sign in to load and manage the household saved to this account.'}
          </div>
        </div>
      </div>

      {/* ── Not configured ── */}
      {!configured ? (
        <div style={{ background: T.cream, borderRadius: 18, padding: '14px 16px', border: `2px dashed ${T.border}` }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>🔌</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Supabase not connected yet</div>
          <div style={{ fontSize: 12, color: T.inkMute, lineHeight: 1.6 }}>
            Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable real parent sign in.
          </div>
        </div>

      ) : status === 'signed_in' && user ? (
        /* ── Signed in ── */
        <div style={{ display: 'grid', gap: 12 }}>
          {/* Signed in panel */}
          <div style={{ background: T.cream, borderRadius: 18, padding: '14px 16px', border: `1.5px solid ${T.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>🛡️ Signed in</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{user.email}</div>
            <div style={{ fontSize: 12, color: T.inkMute, marginBottom: 12 }}>
              This browser is connected to the household saved under this parent account.
            </div>

            {/* Debug info — dev only */}
            {import.meta.env.DEV && (
              <div style={{ background: T.white, borderRadius: 12, padding: '10px 12px', border: `1.5px solid ${T.border}`, fontSize: 11, color: T.inkMute, marginBottom: 12 }}>
                <div><strong style={{ color: T.ink }}>User</strong>: {user.id}</div>
                <div style={{ marginTop: 3 }}><strong style={{ color: T.ink }}>Household</strong>: {household?.id ?? 'loading'}</div>
                <button
                  onClick={() => {
                    const payload = [
                      `email=${user.email ?? ''}`,
                      `user_id=${user.id}`,
                      `household_id=${household?.id ?? ''}`,
                      `household_status=${householdStatus}`,
                      `ts=${new Date().toISOString()}`,
                    ].join('\n');
                    void navigator.clipboard?.writeText(payload);
                  }}
                  style={{ marginTop: 8, background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: T.inkMute, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  ✉️ Copy debug info
                </button>
              </div>
            )}

            <button
              onClick={() => void signOut()}
              style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: T.ink, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              → Sign out
            </button>

            {/* Danger zone */}
            <div style={{ marginTop: 16, background: '#fff5f5', borderRadius: 16, padding: '12px 14px', border: '1.5px solid rgba(220,38,38,0.15)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>⚠️ Danger zone</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Delete parent account</div>
              <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 10 }}>
                This permanently deletes the parent account and the synced household data. This cannot be undone.
              </div>

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ width: '100%', background: T.white, border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 12, padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  Delete account
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Are you sure? This cannot be undone.</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => void handleDeleteAccount()}
                      disabled={isDeleting}
                      style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 12, padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                    >
                      {isDeleting ? 'Deleting…' : 'Yes, delete it'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      style={{ flex: 1, background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '8px 0', fontSize: 12, fontWeight: 700, color: T.ink, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Family space panel */}
          <div style={{ background: T.cream, borderRadius: 18, padding: '14px 16px', border: `1.5px solid ${T.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.inkMute, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
              {householdStatus === 'loading' ? '🔄' : '👨‍👩‍👧'} Family space
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
              {household?.name ?? 'Preparing family space'}
            </div>
            <div style={{ fontSize: 12, color: T.inkMute, lineHeight: 1.5 }}>
              {householdStatus === 'ready'
                ? 'Your parent account is connected to the family space.'
                : householdStatus === 'error'
                  ? 'We hit a problem while setting up the family space. If the live Supabase project is missing the household schema, retry will keep failing until that database setup is applied.'
                  : 'We are preparing the first synced family space for this parent account.'}
            </div>
            {householdStatus === 'error' && (
              <div style={{ marginTop: 12, background: '#fff5f5', borderRadius: 14, padding: '10px 12px', border: '1.5px solid rgba(220,38,38,0.15)' }}>
                <div style={{ fontSize: 12, color: '#dc2626', lineHeight: 1.5, marginBottom: 10 }}>
                  {error ?? 'The family space is not ready yet.'}
                </div>
                <div style={{ fontSize: 11, color: T.inkMute, marginBottom: 10 }}>
                  After the Supabase household schema is applied, return here and choose <strong>Try again</strong>.
                </div>
                <button
                  onClick={() => void retryHousehold()}
                  style={{ background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: T.ink, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  🔄 Try again
                </button>
              </div>
            )}
          </div>
        </div>

      ) : (
        /* ── Sign in form ── */
        <div>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, background: T.cream, borderRadius: 14, padding: 4, border: `1.5px solid ${T.border}`, marginBottom: 18 }}>
            {([['signin', 'Sign in'], ['signup', 'Create account']] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  clearError();
                  setValidationError(null);
                  setEmailSentTo(null);
                  setMode(value);
                }}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: mode === value ? T.white : 'transparent',
                  color: mode === value ? T.ink : T.inkMute,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: mode === value ? T.shadow : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form fields */}
          {isCreateMode && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: T.inkMute }}>
                Parent name
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g. Dora"
                  autoComplete="name"
                  maxLength={60}
                  style={inputStyle}
                />
              </label>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.inkMute }}>
              Parent email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
                autoComplete="email"
                onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) void handleSubmit(); }}
                style={inputStyle}
              />
            </label>
          </div>

          <div style={{ fontSize: 12, color: T.inkMute, marginBottom: 16, lineHeight: 1.5 }}>
            {mode === 'signin'
              ? "We'll email a sign-in link to this address so this device can open the household saved to your account."
              : "We'll email a one-time sign-up link. After you confirm it, the household bootstrap will run automatically."}
          </div>

          {/* Success */}
          {emailSentTo && (
            <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '12px 14px', border: '1.5px solid rgba(34,197,94,0.2)', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>✅ Check your email</div>
              <div style={{ fontSize: 12, color: '#15803d' }}>
                We sent a secure link to <strong>{emailSentTo}</strong>. Open it on this device to finish {mode === 'signin' ? 'signing in' : 'creating the parent account'}.
              </div>
            </div>
          )}

          {/* Errors */}
          {(validationError || error) && (
            <div style={{ background: '#fff5f5', borderRadius: 14, padding: '10px 14px', border: '1.5px solid rgba(220,38,38,0.2)', fontSize: 12, color: '#dc2626', marginBottom: 14 }}>
              ⚠️ {validationError ?? error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            style={{
              width: '100%',
              background: canSubmit ? T.orange : '#fdba74',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              padding: '13px 0',
              fontSize: 14,
              fontWeight: 700,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
              boxShadow: canSubmit ? '0 3px 0 rgba(194,65,12,0.35)' : 'none',
              marginBottom: emailSentTo ? 10 : 0,
            }}
          >
            {submitLabel}
          </button>

          {emailSentTo && (
            <button
              onClick={() => { setEmailSentTo(null); void handleSubmit(); }}
              style={{ width: '100%', background: T.white, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: '11px 0', fontSize: 13, fontWeight: 700, color: T.ink, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Resend email link
            </button>
          )}
        </div>
      )}
    </div>
  );
};
