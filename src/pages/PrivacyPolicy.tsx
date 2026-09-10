const LAST_UPDATED = "10 September 2026";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-muted px-5 py-12">
    <div className="mx-auto max-w-2xl rounded-[32px] border border-border bg-card p-8 shadow-card sm:p-12">
      <a href="/" className="text-sm font-semibold text-primary underline">
        ← Back to Little Loops
      </a>
      <h1 className="mt-6 text-3xl font-bold text-foreground">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-bold">1. Who we are</h2>
          <p className="mt-2">
            Little Loops is operated by Dora Angelov, an individual based in
            Barcelona, Spain ("we", "us", "our"). For the purposes of the EU
            General Data Protection Regulation (GDPR), Dora Angelov is the
            data controller for personal data processed through
            littleloops.xyz.
          </p>
          <p className="mt-2">
            Questions about this policy or your data can be sent to{" "}
            <a className="text-primary underline" href="mailto:dora.angelov@gmail.com">
              dora.angelov@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">2. What data we collect</h2>
          <p className="mt-2">
            Little Loops is a parent-facing account: parents sign in and
            enter data about their household on their children's behalf.
            Children do not create their own accounts and do not sign in.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Account data:</strong> your email address, used to sign
              you in via a magic link (we never see or store a password).
            </li>
            <li>
              <strong>Household data:</strong> household name and time zone.
            </li>
            <li>
              <strong>Child profile data, entered by you:</strong> a child's
              first name, age, and a chosen illustrated avatar.
            </li>
            <li>
              <strong>Routine data:</strong> the morning/evening tasks you set
              up, and daily completion progress recorded as your child (or
              you, on their behalf) checks tasks off.
            </li>
            <li>
              <strong>Payment data:</strong> if you subscribe, our payment
              processor (Stripe) handles your card details directly — we
              never see or store your card number. We keep only your
              subscription status and Stripe's reference IDs for your
              household.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">3. Why we process this data</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>To provide the service</strong> (contract performance):
              storing and syncing your household's routines across devices,
              and processing your subscription.
            </li>
            <li>
              <strong>Security and abuse prevention</strong> (legitimate
              interest): access-control checks on your account and household
              data.
            </li>
          </ul>
          <p className="mt-2">
            We do not use your data for advertising, and we do not sell or
            rent personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">4. Children's data</h2>
          <p className="mt-2">
            Little Loops is designed to be used by a child alongside a
            parent, on a parent-controlled device or account. We do not
            knowingly collect personal data directly from children — every
            child profile is created and controlled by the signed-in parent,
            who can edit or delete it at any time from Parent Settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">5. Who processes data on our behalf</h2>
          <p className="mt-2">We use a small number of specialist processors to run the service:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Supabase</strong> — database, authentication, and cloud sync.</li>
            <li><strong>Stripe</strong> — subscription billing and payment processing.</li>
            <li><strong>GitHub Pages / Cloudflare</strong> — hosting and content delivery.</li>
          </ul>
          <p className="mt-2">
            These providers may process data outside the European Economic
            Area. Where they do, they rely on their own GDPR-compliant
            safeguards (such as Standard Contractual Clauses) — see each
            provider's own privacy policy for details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">6. How long we keep data</h2>
          <p className="mt-2">
            We keep your account and household data for as long as your
            account is active. If you delete your account, or ask us to via{" "}
            <a className="text-primary underline" href="mailto:dora.angelov@gmail.com">
              dora.angelov@gmail.com
            </a>
            , we delete your household's data within 30 days, except where we
            must keep payment records longer to comply with tax law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">7. Your rights</h2>
          <p className="mt-2">Under GDPR, you can ask us to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>give you a copy of the data we hold about your household;</li>
            <li>correct inaccurate data;</li>
            <li>delete your data ("right to be forgotten");</li>
            <li>restrict or object to certain processing;</li>
            <li>export your data in a portable format.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these, email{" "}
            <a className="text-primary underline" href="mailto:dora.angelov@gmail.com">
              dora.angelov@gmail.com
            </a>
            . You also have the right to lodge a complaint with the Spanish
            Data Protection Agency (Agencia Española de Protección de Datos,{" "}
            <a className="text-primary underline" href="https://www.aepd.es" target="_blank" rel="noreferrer">
              aepd.es
            </a>
            ) or your own country's supervisory authority.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">8. Storage on your device</h2>
          <p className="mt-2">
            When you're signed out, or as an offline fallback, Little Loops
            stores your routine data locally in your browser
            (<code>localStorage</code>). This stays on your device and is not
            sent to us unless you sign in and sync. We do not use tracking or
            advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">9. Changes to this policy</h2>
          <p className="mt-2">
            If we make material changes, we'll update the date at the top of
            this page and, where required by law, notify you directly.
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
