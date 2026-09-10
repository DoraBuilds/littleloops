/**
 * Adds security headers that GitHub Pages cannot set (HSTS, X-Frame-Options,
 * X-Content-Type-Options). Deployed in front of www.littleloops.xyz once
 * Cloudflare is proxying the domain — see docs/deployment-hardening.md.
 *
 * The CSP and Referrer-Policy already ship via <meta> in index.html and are
 * NOT duplicated here to avoid two sources of truth drifting apart; only
 * headers that <meta> cannot deliver are added at this layer.
 */
export default {
  async fetch(request, env, ctx) {
    const response = await fetch(request);
    const headers = new Headers(response.headers);

    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-Content-Type-Options", "nosniff");
    // Redundant with X-Frame-Options above, but this is the modern
    // replacement and some browsers prefer it; frame-ancestors can only be
    // delivered as a real header (the CSP <meta> tag silently ignores it).
    headers.append("Content-Security-Policy", "frame-ancestors 'none'");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
