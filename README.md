# Sagepilot email signature

Team email signature in the website's design language, built around ONE
animated hero scene: the Sagepilot robot at work.

**The hero GIF** (420×96 display, mint ChatPanel surface, real Instrument Sans):
the robot sits in the scene with a green "online" status dot. Each scene he
closes his eyes to think, a typing bubble slides up and its dots run a wave
(the status dot pulses), the headline rotates through **15 variations** of
"AI employees that …" (win / serve / grow every customer, never sleep, speak
every language, answer in seconds, recover every cart, …), a result chip
springs in (small → overshoot → settle) — and he grins. Every chip carries the
real app logo doing the work (Shopify, WhatsApp, Instagram, Razorpay, Judge.me,
Loop Returns, Shiprocket, Klaviyo, Intercom, Messenger, Zendesk, Gmail,
Salesforce), and the background sparkle drifts slowly across the loop. Full
loop ≈ 41s, 150 delta-encoded frames, ~530 KB. A trust badge strip (GDPR /
ISO 27001 / G2 "Users love us") renders below the CTA as a separate 6 KB PNG.

**The signature** is three composed blocks (no container boxes — editorial,
like the site): typographic identity (name + two-tone Sage/pilot linking to
the site), the hero scene, and one action line — "Hire your first AI
employee →" CTA left (links to /request-demo), quiet email right. Compact
variant = mint avatar tile + name + contacts.

## Share this with the team

**https://champstar02.github.io/sagepilot-email-signature/**

Anyone on the team opens that link, types their name and role, picks badges,
clicks **Copy signature**, and pastes into Gmail. Nothing to install, and the
images come from the CDN so they work in everyone's mail client.

## Use it

Open **signature-builder.html** in a browser. Fill in your details, click
**Copy signature**, paste into your mail client (Gmail / Apple Mail / Outlook
steps are on the page). Works for any teammate.

## Files

- `signature-builder.html` — builder + live light/dark preview (dark simulates
  client auto-inversion).
- `assets/sagepilot-hero-animated.gif` — hero scene, 840×192 (2x), ~123 KB.
- `assets/sagepilot-hero.png` — static fallback (scene 1).
- `assets/sagepilot-mark-animated.gif` — blink/grin avatar tile (compact variant), ~8 KB.
- `assets/sagepilot-mark.png` — static fallback.
- `assets/fonts/` — Instrument Sans (OFL), used to typeset the hero.
- `scripts/generate-assets.mjs` — regenerates everything from
  `sagepilot-website/public/logo-mark.svg` (sharp from the website's
  node_modules; text via fontconfig + pango). Run: `node scripts/generate-assets.mjs`.

## Hosting (live now)

Email clients load images from a public URL. The assets are served from this
repo (github.com/champstar02/sagepilot-email-signature) via the jsDelivr CDN —
independent of the website codebase, nothing to deploy:

- https://cdn.jsdelivr.net/gh/champstar02/sagepilot-email-signature@v13/assets/sagepilot-hero-animated.gif
- https://cdn.jsdelivr.net/gh/champstar02/sagepilot-email-signature@v13/assets/sagepilot-mark-animated.gif

URLs are pinned to the immutable `v13` tag (jsDelivr caches mutable `@main`
refs unpredictably). After regenerating assets: commit + push, tag the new
release (`git tag v14 && git push origin v14`), update the tag in
signature-builder.html's asset base URL, and re-copy signatures.

## Client notes

- Gmail, Apple Mail, Outlook (web/Mac): full animation.
- Classic Outlook for Windows: first GIF frame only (robot idle, chip visible) — degrades cleanly.
- Dark mode: clients auto-invert text colors; the mint surface is baked into
  the image so the hero looks intentional on dark backgrounds.
