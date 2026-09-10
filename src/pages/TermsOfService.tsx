const LAST_UPDATED = "10 September 2026";

const TermsOfService = () => (
  <div className="min-h-screen bg-muted px-5 py-12">
    <div className="mx-auto max-w-2xl rounded-[32px] border border-border bg-card p-8 shadow-card sm:p-12">
      <a href="/" className="text-sm font-semibold text-primary underline">
        ← Back to Little Loops
      </a>
      <h1 className="mt-6 text-3xl font-bold text-foreground">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-lg font-bold">1. Who you're contracting with</h2>
          <p className="mt-2">
            Little Loops (littleloops.xyz) is provided by Dora Angelov
            (NIF Y4286176W), an individual based in Barcelona, Spain, trading
            as Little Loops ("we", "us"). By creating an account or
            subscribing, you're entering into this agreement with Dora
            Angelov directly. Contact:{" "}
            <a className="text-primary underline" href="mailto:dora.angelov@gmail.com">
              dora.angelov@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">2. The service</h2>
          <p className="mt-2">
            Little Loops is a browser-based app that helps parents build
            visual morning and evening routine checklists for their
            children, with optional cloud sync across devices for
            signed-in, subscribed households.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">3. Your account</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>You must be an adult to create an account — accounts are for parents/guardians, not children.</li>
            <li>You're responsible for keeping access to your sign-in email secure.</li>
            <li>You're responsible for the accuracy of the household and child information you enter.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">4. Subscription and billing</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Little Loops offers a household subscription at €6.99/month, or €70/year (paid annually), billed automatically until cancelled.</li>
            <li>Payment is processed by Stripe. We don't see or store your full card details.</li>
            <li>Prices are shown inclusive of any VAT required for your location, where applicable.</li>
            <li>You can cancel anytime from Parent Settings, or by emailing us. Cancelling stops future charges; you keep access until the end of the period you already paid for.</li>
            <li>We don't offer partial-month refunds for early cancellation, except where required by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold">5. Your right to withdraw (EU/EEA customers)</h2>
          <p className="mt-2">
            Under EU consumer law, you normally have 14 days after
            subscribing to cancel for a full refund, with no reason needed.
            Because Little Loops gives you access to the service
            immediately on subscribing, by completing checkout you
            expressly ask us to start providing the service right away and
            acknowledge that you lose this 14-day withdrawal right once the
            service has started — you can still cancel at any time going
            forward under section 4, you just won't get a refund for time
            already used.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">6. Acceptable use</h2>
          <p className="mt-2">Please don't:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>use the service for anything illegal, or to store data you don't have the right to store;</li>
            <li>try to disrupt, reverse-engineer, or gain unauthorized access to the app or its data;</li>
            <li>share your account in a way that circumvents the subscription.</li>
          </ul>
          <p className="mt-2">We may suspend or terminate accounts that break these terms.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold">7. Your data</h2>
          <p className="mt-2">
            How we handle the data you enter is described in our{" "}
            <a className="text-primary underline" href="/privacy">Privacy Policy</a>. You can request an export or deletion
            of your data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">8. Availability and changes</h2>
          <p className="mt-2">
            We aim to keep Little Loops available and working well, but as a
            small, independently-run service we can't guarantee uninterrupted
            access. We may update or change features over time. If we make a
            change that materially reduces what a paid subscription includes,
            we'll tell you in advance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">9. Liability</h2>
          <p className="mt-2">
            Little Loops is a routine-checklist tool, not a safety-critical
            or medical product. To the extent permitted by law, we're not
            liable for indirect or consequential losses arising from your
            use of the app. Nothing in these terms limits liability that
            cannot be limited under Spanish or EU consumer law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">10. Governing law</h2>
          <p className="mt-2">
            These terms are governed by Spanish law. If you're a consumer
            resident elsewhere in the EU, you also keep any mandatory
            consumer-protection rights of your own country of residence.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold">11. Changes to these terms</h2>
          <p className="mt-2">
            If we make material changes, we'll update the date at the top of
            this page and, where required by law, notify you before they take
            effect.
          </p>
        </section>
      </div>
    </div>
  </div>
);

export default TermsOfService;
