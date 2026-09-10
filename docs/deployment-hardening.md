# Deployment hardening

Tracks issue #60: a minimum production security-header baseline for this app.

## Current host: GitHub Pages (custom domain `www.littleloops.xyz`)

GitHub Pages does not support custom HTTP response headers. That means real
`Strict-Transport-Security`, `X-Frame-Options` / `frame-ancestors`, and
`X-Content-Type-Options` headers **cannot be set** on this host, no matter
what's in the repo — there's no config file or dashboard setting for it.

## What's covered today (via `<meta>` in `index.html`)

A `Content-Security-Policy` and `Referrer-Policy` are delivered via `<meta
http-equiv>` tags, since those two (unlike the ones above) are allowed to be
set that way:

- `script-src 'self'` — blocks any injected/inline script from executing
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` —
  `unsafe-inline` is required because the app uses React inline `style={{}}`
  props extensively (they render as `style="..."` attributes); tightening
  this would mean rewriting every inline style to a class, which is a much
  larger change than this issue scoped
- `font-src`, `img-src`, `connect-src` — scoped to `self` plus this app's
  actual Supabase project and Google Fonts, nothing else
- `worker-src 'self' blob:` — without this, `worker-src` falls back to
  `script-src 'self'`, which blocks `canvas-confetti`'s animation worker
  (loaded from a `blob:` URL). That silently killed all confetti in the app
  (fixed in #162) with no thrown error, just a console CSP violation —
  easy to miss in manual testing since the rest of the page works fine.
- `referrer` meta tag set to `strict-origin-when-cross-origin`

Verified against a real production build (`vite preview` + headless
Chromium): zero CSP violations across `/`, `/parent/schedules`,
`/auth/callback`, and the 404 route, fonts load correctly, and a real
`signInWithOtp` request to Supabase went through (got a real API response,
not a CSP block).

**Per the CSP spec, `frame-ancestors`, `report-uri`, and `sandbox` are
silently ignored when delivered via `<meta>`.** They only work as a real HTTP
header — see below.

## What's NOT covered, and what to do about it

Clickjacking protection (`frame-ancestors`), HSTS, and
`X-Content-Type-Options` need a real HTTP header, which means putting
something in front of GitHub Pages that can add headers. The common
zero-cost option is **Cloudflare** (free tier) proxying the `littleloops.xyz`
domain instead of pointing DNS straight at GitHub Pages.

The Worker that adds these headers is already written:
`cloudflare/security-headers-worker.js`, deployed via
`cloudflare/wrangler.toml`.

Setup needs a Cloudflare account and a DNS change, both outside what can be
done from this repo — this is the one manual step left:

1. Add `littleloops.xyz` as a site in a Cloudflare account (free tier is
   enough) and switch the domain's nameservers to the two Cloudflare gives
   you (at whatever registrar the domain was bought through)
2. Once Cloudflare shows the zone as active, run from `cloudflare/`:
   ```sh
   npx wrangler deploy
   ```
   (first run prompts a browser login to authorize wrangler against the
   Cloudflare account)

Until this is done, clickjacking protection for this app is effectively
undocumented/absent, which is the residual risk issue #60 originally
flagged, tracked to completion in #172.

## Verification

To re-check after any change to the CSP meta tag:

```sh
npm run build
npm run preview -- --port 4173
```

Then load `http://localhost:4173` in a browser with devtools open and watch
the console for `Refused to ...` / `Content Security Policy` violation
messages while clicking through the app's main flows (landing, sign-in
attempt, setup, routine view, parent settings, schedules).
