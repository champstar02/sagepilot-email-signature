/*
 * Generates the email-signature brand assets from the Sagepilot logo mark:
 *  - assets/sagepilot-mark-animated.gif   (blink + grin avatar tile, 3x of 44px — compact variant)
 *  - assets/sagepilot-mark.png            (static fallback)
 *  - assets/sagepilot-hero-animated.gif   (hero scene, 2x of 420x96: the robot
 *    works — eyes close to think, typing dots wave, chip pops, he grins)
 *  - assets/sagepilot-hero.png            (static fallback, scene 1)
 *  - assets/frames-preview.png            (QA sheet of key frames)
 *
 * Type is set in the real Instrument Sans (assets/fonts) via fontconfig+pango.
 * Surfaces follow DESIGN-SYSTEM-V2.md: ChatPanel mint gradient #D8F3E4->#F4FBF7,
 * ActionChip = white chip + green sparkle + brand-700 semibold text, bare mark
 * as the agent avatar (chat-bits.tsx AgentAvatar).
 * Uses sharp from the sagepilot-website repo. Run: node scripts/generate-assets.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "assets");
mkdirSync(outDir, { recursive: true });

// Point fontconfig at the bundled Instrument Sans before sharp loads.
const fontsDir = join(outDir, "fonts");
const fontsConf = join(fontsDir, "fonts.conf");
writeFileSync(
  fontsConf,
  `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontsDir}</dir>
  <dir>/System/Library/Fonts</dir>
  <dir>/Library/Fonts</dir>
  <cachedir>${join(fontsDir, ".cache")}</cachedir>
</fontconfig>
`,
);
process.env.FONTCONFIG_FILE = fontsConf;

const require = createRequire(import.meta.url);
const sharp = require("/Users/tharunbalaji/Desktop/Work/Projects/sagepilot-website/node_modules/sharp");

/* ------------------------------------------------------------------- mark */

const markSvg = readFileSync(
  "/Users/tharunbalaji/Desktop/Work/Projects/sagepilot-website/public/logo-mark.svg",
  "utf8",
);
const inner = markSvg
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .trim();

const EYE_CY = 13.66;
const EYE_PREFIXES = ['d="M17.8882', 'd="M8.3705'];
const MOUTH_PREFIX = 'd="M9.30672';
const MOUTH_CX = 13.3;
const MOUTH_CY = 20.7;

// Squash the eye arcs / scale the smile inside any SVG source that carries the
// mark's paths — works for both logo-mark.svg and the full logo.svg lockup.
function applyFace(src, { eyes = 1, mouth = 1 } = {}) {
  return src
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (eyes < 1 && EYE_PREFIXES.some((p) => t.includes(p))) {
        const ty = EYE_CY * (1 - eyes);
        return `<g transform="translate(0 ${ty.toFixed(4)}) scale(1 ${eyes})">${t}</g>`;
      }
      if (mouth !== 1 && t.includes(MOUTH_PREFIX)) {
        const tx = MOUTH_CX * (1 - mouth);
        const ty = MOUTH_CY * (1 - mouth);
        return `<g transform="translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${mouth})">${t}</g>`;
      }
      return line;
    })
    .join("\n");
}
const face = (opts) => applyFace(inner, opts);

const OPEN = { eyes: 1 };
const HALF = { eyes: 0.5 };
const SHUT = { eyes: 0.15 };
const GRIN_IN = { eyes: 0.75, mouth: 1.05 };
const GRIN = { eyes: 0.45, mouth: 1.11 };

const MINT = `<linearGradient id="mint" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#D8F3E4"/><stop offset="1" stop-color="#F4FBF7"/>
</linearGradient>`;

/* -------------------------------------------------------------- mark tile */

const TILE = 132; // 3x of 44px display (compact variant avatar)
function tileSvg(faceOpts) {
  const markPx = 96;
  const s = markPx / 26;
  const off = (TILE - markPx) / 2;
  return `<svg width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>${MINT}</defs>
  <rect x="1.5" y="1.5" width="${TILE - 3}" height="${TILE - 3}" rx="30" fill="url(#mint)" stroke="#C4E8D4" stroke-width="3"/>
  <g transform="translate(${off} ${off}) scale(${s})">${face(faceOpts)}</g>
</svg>`;
}
const tilePng = (f) => sharp(Buffer.from(tileSvg(f))).png().toBuffer();

/* A blink only reads as smooth with eased in-between steps — 1 -> .5 -> .15
   stutters because the eye teleports. Real eyes also close faster than they
   open, so the closing ramp is shorter than the opening one. 40ms/frame is
   the shortest delay every mail client honours (below ~2cs many clamp to
   100ms, which is what makes GIFs feel laggy). */
const BLINK_MS = 40;
const CLOSING = [0.74, 0.44, 0.18];
const OPENING = [0.2, 0.42, 0.66, 0.86];
const blink = (holdMs = 50) => [
  ...CLOSING.map((e) => ({ f: { eyes: e }, ms: BLINK_MS })),
  { f: SHUT, ms: holdMs },
  ...OPENING.map((e) => ({ f: { eyes: e }, ms: BLINK_MS })),
];

// Grin: ease in, hold, ease back out so the loop doesn't snap.
const GRIN_IN_STEPS = [
  { eyes: 0.86, mouth: 1.03 },
  { eyes: 0.64, mouth: 1.08 },
];
const grin = () => [
  ...GRIN_IN_STEPS.map((f) => ({ f, ms: BLINK_MS })),
  { f: GRIN, ms: 620 },
  ...[...GRIN_IN_STEPS].reverse().map((f) => ({ f, ms: BLINK_MS })),
];

const tileSeq = [
  { f: OPEN, ms: 2400 },
  ...blink(),
  { f: OPEN, ms: 190 },
  ...blink(),
  { f: OPEN, ms: 1500 },
  ...grin(),
];

/* ------------------------------------------------------- full logo lockup
 * The site's whole logo (mark + "sagepilot" wordmark), bare on transparency
 * at its natural 128x30 — no plate (user direction: cleaner). The robot
 * still blinks. NOTE: "Sage" is near-black, and email clients invert TEXT in
 * dark mode but never images, so on dark backgrounds that word goes dim;
 * "pilot" and the mark stay bright green either way.
 */
const logoInner = readFileSync(
  "/Users/tharunbalaji/Desktop/Work/Projects/sagepilot-website/public/logo.svg",
  "utf8",
)
  .replace(/<svg[\s\S]*?>/, "")
  .replace(/<\/svg>\s*$/, "")
  .trim();

const LOGO_W = 128; // logo.svg viewBox
const LOGO_H = 30;
const LOGO_SCALE = 2; // 2x asset -> 128x30 display, the logo's natural size
const LOCKUP_W = LOGO_W * LOGO_SCALE;
const LOCKUP_H = LOGO_H * LOGO_SCALE;

// Bare logo on transparency — no plate, no padding.
function lockupSvgAt(faceOpts, scale) {
  const w = LOGO_W * scale;
  const h = LOGO_H * scale;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="scale(${scale})">${applyFace(logoInner, faceOpts)}</g>
</svg>`;
}
const lockupPng = (f) => sharp(Buffer.from(lockupSvgAt(f, LOGO_SCALE))).png().toBuffer();
// Text-sized lockup for inline use in the role line: 128x30 asset, 64x15
// display — 2x retina at the size of the surrounding 13px type.
const inlineLogoPng = (f) => sharp(Buffer.from(lockupSvgAt(f, 1))).png().toBuffer();

// Favicon-sized bare mark for the "sagepilot.ai" contact link. 32px asset,
// 16px display. The face is bright green, so it holds up on dark backgrounds.
const FAVICON = 32;
const faviconSvg = `<svg width="${FAVICON}" height="${FAVICON}" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

// LinkedIn mark for the name row (not in the website's icon set, so drawn
// here). Official brand blue; 32px asset, 16px display.
const linkedinSvg = `<svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" rx="5" fill="#0A66C2"/>
  <circle cx="6.9" cy="6.9" r="1.9" fill="#FFFFFF"/>
  <rect x="5.3" y="9.9" width="3.2" height="8.8" fill="#FFFFFF"/>
  <path d="M10.6 9.9h3.05v1.2h.05c.45-.8 1.5-1.45 2.85-1.45 2.5 0 3.35 1.5 3.35 4v5.05h-3.2v-4.5c0-1.25-.25-2.1-1.5-2.1-1.15 0-1.6.8-1.6 2v4.6h-3z" fill="#FFFFFF"/>
</svg>`;

/* ------------------------------------------------------------ text helpers */

const escXml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function text(str, { font, color, alpha = 100 }) {
  const markup = `<span foreground="${color}"${alpha < 100 ? ` alpha="${Math.max(1, Math.round(alpha))}%"` : ""}>${escXml(str)}</span>`;
  const img = sharp({ text: { text: markup, font, dpi: 72, rgba: true } });
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  return { buf, w: meta.width, h: meta.height };
}

/* ------------------------------------------------------------- hero scene
 * 840x192 (displayed 420x96). Mint ChatPanel. The robot is IN the scene with
 * an "online" status dot; headline rotates; chips pop; the robot reacts.
 */
const SW = 840;
const SH = 192;
const ROBOT_X = 40;
const ROBOT_Y = 34;
const ROBOT_PX = 124;
const TX = 200; // text zone left
const HY = 42; // headline top
const CY = 106; // chip top

const SPARKLE_PATHS = `<path d="M12.5 2.5l1.1 3.1a3 3 0 0 0 1.8 1.8l3.1 1.1-3.1 1.1a3 3 0 0 0-1.8 1.8l-1.1 3.1-1.1-3.1a3 3 0 0 0-1.8-1.8L6.5 8.5l3.1-1.1a3 3 0 0 0 1.8-1.8l1.1-3.1z"/>
<path d="M5 12l.65 1.85a2 2 0 0 0 1.2 1.2L8.7 15.7l-1.85.65a2 2 0 0 0-1.2 1.2L5 19.4l-.65-1.85a2 2 0 0 0-1.2-1.2L1.3 15.7l1.85-.65a2 2 0 0 0 1.2-1.2L5 12z"/>`;

// The website's AsciiField "scatter" variant (src/components/home/
// ascii-field.tsx), ported verbatim: same charset, same drifting density
// patches, same per-cell hash gating, same per-glyph life cycles and
// character swaps, same onTint (mint) palette. `phase` advances the same `t`
// clock the site animates, one step per scene.
const SCATTER_RAMP = "·.:;~-+=^*/\\#%@";
const fieldHash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const CELL = 24; // site hero uses cell={12}; this canvas renders at 2x
function glyphField(phase = 0) {
  const t = 2.5 + phase * 1.0; // site starts at t=2.5 and flows forward
  const items = [];
  const cols = Math.ceil(SW / CELL);
  const rows = Math.ceil(SH / CELL);
  const fontPx = Math.round(CELL * 0.78);
  for (let i = 0; i <= cols; i++) {
    for (let j = 0; j <= rows; j++) {
      const x = i * CELL + CELL / 2;
      const y = j * CELL + CELL / 2;
      // drifting density patches decide WHERE glyphs may live
      const wx = i + 2.2 * Math.sin(j * 0.09 + t * 0.16);
      const wy = j + 2.2 * Math.sin(i * 0.08 - t * 0.13);
      const field =
        Math.sin(wx * 0.14 + t * 0.11) +
        Math.sin(wy * 0.17 - t * 0.09) +
        Math.sin((wx + wy) * 0.07 + t * 0.07);
      const density = Math.pow(Math.min(1, Math.max(0, (field + 3) / 6)), 2.0);
      const r = fieldHash(i, j);
      if (r > density * 1.1) continue; // semi-random reveal
      const life = 0.5 + 0.5 * Math.sin(t * (0.25 + r * 0.5) + r * 6.283);
      const lum = density * (0.35 + 0.65 * life);
      if (lum < 0.05) continue;
      const swap = Math.floor(t * 0.3 + r * 9);
      const charMix = density * 0.6 + fieldHash(i + swap, j - swap) * 0.4;
      const ch =
        SCATTER_RAMP[Math.min(SCATTER_RAMP.length - 1, Math.floor(charMix * SCATTER_RAMP.length))];
      const accent = fieldHash(i + 13, j + 57) > 0.94;
      // onTint palette: mint eats light greens — deep and heavy (site verbatim)
      let alpha = accent ? 0.5 + lum * 0.4 : 0.18 + lum * 0.42;
      const color = accent ? "#1BB46A" : "#117042";
      // Like the site, the field runs the full card with the copy on top —
      // but email type is small, so damp it over the robot and headline zone
      // and let it come to full strength on the open right side.
      alpha *= 0.34 + 0.66 * Math.min(1, Math.max(0, (x - 470) / 190));
      items.push(
        `<text x="${x}" y="${y + fontPx * 0.35}" text-anchor="middle" font-family="Menlo, Monaco, monospace" font-size="${fontPx}" fill="${color}" opacity="${alpha.toFixed(3)}">${escXml(ch)}</text>`,
      );
    }
  }
  return items.join("\n");
}

function heroBase({ fieldPhase = 0, pulse = false, faceOpts = OPEN } = {}) {
  const s = ROBOT_PX / 26;
  // status dot sits on the robot's bounding box corner
  const dotX = ROBOT_X + ROBOT_PX - 12;
  const dotY = ROBOT_Y + ROBOT_PX - 14;
  return `<svg width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>${MINT}
    <clipPath id="card"><rect x="2" y="2" width="${SW - 4}" height="${SH - 4}" rx="29"/></clipPath>
  </defs>
  <rect x="1" y="1" width="${SW - 2}" height="${SH - 2}" rx="30" fill="url(#mint)" stroke="#CFEDDD" stroke-width="2"/>
  <g clip-path="url(#card)">${glyphField(fieldPhase)}</g>
  <g transform="translate(${ROBOT_X} ${ROBOT_Y}) scale(${s})">${face(faceOpts)}</g>
  <circle cx="${dotX}" cy="${dotY}" r="${pulse ? 15 : 12}" fill="#22E185" stroke="#F4FBF7" stroke-width="5" opacity="${pulse ? 0.8 : 1}"/>
</svg>`;
}

// Whole headline as ONE pango layout so spacing and baselines are exact.
async function linePng(tail, { preAlpha, tailAlpha }) {
  const pre = `<span weight="500" foreground="#181818"${preAlpha < 100 ? ` alpha="${Math.max(1, Math.round(preAlpha))}%"` : ""}>AI employees that </span>`;
  const tl = `<span weight="600" foreground="#0E6B43"${tailAlpha < 100 ? ` alpha="${Math.max(1, Math.round(tailAlpha))}%"` : ""}>${escXml(tail)}</span>`;
  return sharp({
    text: { text: pre + tl, font: "Instrument Sans 33", dpi: 72, rgba: true },
  })
    .png()
    .toBuffer();
}

// The site's ActionChip grammar: [app icon] green semibold text [sparkle].
// Chips without an app icon lead with the sparkle instead.
const iconCache = new Map();
async function appIcon(name, size) {
  const key = `${name}@${size}`;
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      await sharp(join(outDir, "apps", `${name}.png`)).resize(size, size).png().toBuffer(),
    );
  }
  return iconCache.get(key);
}

async function chipPng(label, alpha = 100, icon = null) {
  const t = await text(label, {
    font: "Instrument Sans Semi-Bold 22",
    color: "#1BB46A",
    alpha,
  });
  const padX = 16;
  const gap = 9;
  const h = 46;
  const a = alpha / 100;
  const overlays = [];
  let w;
  if (icon) {
    const iconSize = 28;
    const endSparkle = 20;
    w = padX + iconSize + gap + t.w + 8 + endSparkle + 13;
    const bg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="12" fill="#FFFFFF" fill-opacity="${a}" stroke="#DCEFE4" stroke-opacity="${a}" stroke-width="1.5"/>
      <g transform="translate(${padX + iconSize + gap + t.w + 8} ${(h - endSparkle) / 2})" fill="#22E185" fill-opacity="${a}"><g transform="scale(1)">${SPARKLE_PATHS}</g></g>
    </svg>`;
    let iconBuf = await appIcon(icon, 28);
    if (a < 1) {
      const { data, info } = await sharp(iconBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let p = 3; p < data.length; p += 4) data[p] = Math.round(data[p] * a);
      iconBuf = await sharp(data, { raw: info }).png().toBuffer();
    }
    overlays.push({ input: iconBuf, left: padX, top: Math.round((h - 28) / 2) });
    overlays.push({ input: t.buf, left: padX + 28 + gap, top: Math.round((h - t.h) / 2) });
    const buf = await sharp(Buffer.from(bg)).composite(overlays).png().toBuffer();
    return { buf, w, h };
  }
  w = padX + 26 + gap + t.w + padX;
  const bg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="12" fill="#FFFFFF" fill-opacity="${a}" stroke="#DCEFE4" stroke-opacity="${a}" stroke-width="1.5"/>
    <g transform="translate(${padX} ${(h - 26) / 2}) scale(1.3)" fill="#22E185" fill-opacity="${a}">${SPARKLE_PATHS}</g>
  </svg>`;
  const buf = await sharp(Buffer.from(bg))
    .composite([{ input: t.buf, left: padX + 26 + gap, top: Math.round((h - t.h) / 2) }])
    .png()
    .toBuffer();
  return { buf, w, h };
}

const TYPING_WAVE = [
  [0.95, 0.5, 0.3],
  [0.45, 0.95, 0.5],
  [0.3, 0.5, 0.95],
];
async function typingPng(alpha, phase) {
  const h = 46;
  const w = 80;
  const dotAlphas = TYPING_WAVE[phase % TYPING_WAVE.length];
  const a = alpha / 100;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="12" fill="#FFFFFF" fill-opacity="${a}" stroke="#DCEFE4" stroke-opacity="${a}" stroke-width="1.5"/>
    <circle cx="24" cy="23" r="4.5" fill="#1BB46A" fill-opacity="${(dotAlphas[0] * a).toFixed(3)}"/>
    <circle cx="40" cy="23" r="4.5" fill="#1BB46A" fill-opacity="${(dotAlphas[1] * a).toFixed(3)}"/>
    <circle cx="56" cy="23" r="4.5" fill="#1BB46A" fill-opacity="${(dotAlphas[2] * a).toFixed(3)}"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

// Every scene carries the icon of the tool doing the work — the site's Dock
// motif ("real app icons, full color") folded into the chips.
const SCENES = [
  { tail: "win every customer", chip: "Abandoned cart recovered", icon: "shopify" },
  { tail: "serve every customer", chip: "Return resolved in 40 seconds", icon: "loopreturns" },
  { tail: "grow every customer", chip: "Repeat order placed", icon: "shopify" },
  { tail: "never sleep", chip: "Order query answered at 2 AM", icon: "whatsapp" },
  { tail: "speak every language", chip: "Replied in Hindi and English", icon: "whatsapp" },
  { tail: "answer in seconds", chip: "First reply in 8 seconds", icon: "intercom" },
  { tail: "recover every cart", chip: "Payment link converted", icon: "razorpay" },
  { tail: "delight customers", chip: "Rated 5 stars after chat", icon: "judgeme" },
  { tail: "work every channel", chip: "Instagram DM answered", icon: "instagram" },
  { tail: "handle every return", chip: "Exchange booked, sale saved", icon: "shiprocket" },
  { tail: "know every order", chip: "Tracking sent before asked", icon: "gmail" },
  { tail: "remember everyone", chip: "Birthday offer delivered", icon: "klaviyo" },
  { tail: "upsell with taste", chip: "Size swap saved the sale", icon: "messenger" },
  { tail: "scale with you", chip: "1,200 tickets this week", icon: "zendesk" },
  { tail: "close every loop", chip: "CRM updated automatically", icon: "salesforce" },
];

async function heroFrame(spec) {
  // spec: { base: {wm, pulse, faceOpts}, lines: [...],
  //         chips: [{label?|typing?, phase?, alpha, dx?, dy?, scale?}] }
  const overlays = [];
  for (const l of spec.lines) {
    overlays.push({ input: await linePng(l.tail, l), left: TX, top: HY });
  }
  for (const c of spec.chips) {
    if (c.typing) {
      overlays.push({
        input: await typingPng(c.alpha, c.phase || 0),
        left: TX + Math.round(c.dx || 0),
        top: CY + Math.round(c.dy || 0),
      });
    } else {
      const chip = await chipPng(c.label, c.alpha, c.icon);
      let input = chip.buf;
      let left = TX + Math.round(c.dx || 0);
      let top = CY + Math.round(c.dy || 0);
      if (c.scale && c.scale !== 1) {
        const nw = Math.round(chip.w * c.scale);
        const nh = Math.round(chip.h * c.scale);
        input = await sharp(chip.buf).resize(nw, nh).png().toBuffer();
        left -= Math.round((nw - chip.w) / 2);
        top -= Math.round((nh - chip.h) / 2);
      }
      overlays.push({ input, left, top });
    }
  }
  return sharp(Buffer.from(heroBase(spec.base))).composite(overlays).png().toBuffer();
}

const line = (i, tailAlpha) => ({ tail: SCENES[i].tail, preAlpha: 100, tailAlpha });

function holdSpec(i, faceOpts = OPEN) {
  return {
    base: { fieldPhase: 0, faceOpts },
    lines: [line(i, 100)],
    chips: [{ label: SCENES[i].chip, icon: SCENES[i].icon, alpha: 100, dx: 0 }],
  };
}

// Story per scene: robot idles -> blinks and thinks while the old result
// fades -> the typing bubble SLIDES UP into place -> dots run a wave (status
// dot pulsing) -> the chip springs in (small -> overshoot -> settle) -> grin.
const heroSeq = [];
for (let i = 0; i < SCENES.length; i++) {
  const j = (i + 1) % SCENES.length;
  // Glyph field drifts and twinkles once per scene — slow background motion
  // across the loop at ~1 repaint per scene.
  const sceneWm = { fieldPhase: i };
  const push = (base, lines, chips, ms) => heroSeq.push({ spec: { base: { ...sceneWm, ...base }, lines, chips }, ms });

  push({ faceOpts: OPEN }, [line(i, 100)], [{ label: SCENES[i].chip, icon: SCENES[i].icon, alpha: 100 }], 1150);
  // old result fades while eyes close
  push({ faceOpts: HALF }, [line(i, 55)], [{ label: SCENES[i].chip, icon: SCENES[i].icon, alpha: 50 }], 70);
  // typing bubble slides up as the new headline fades in
  push({ pulse: true, faceOpts: SHUT }, [line(j, 55)], [{ typing: true, phase: 0, alpha: 55, dy: 8 }], 70);
  // three-beat typing wave, bubble settled
  for (const [k, phase] of [0, 1, 2].entries()) {
    push(
      { pulse: k % 2 === 0, faceOpts: SHUT },
      [line(j, 100)],
      [{ typing: true, phase, alpha: 100 }],
      170,
    );
  }
  // chip springs in: small -> overshoot -> settle, robot grins at it
  push({ faceOpts: GRIN_IN }, [line(j, 100)], [{ label: SCENES[j].chip, icon: SCENES[j].icon, alpha: 60, scale: 0.94, dy: 6 }], 60);
  push({ faceOpts: GRIN }, [line(j, 100)], [{ label: SCENES[j].chip, icon: SCENES[j].icon, alpha: 100, scale: 1.07 }], 70);
  push({ faceOpts: GRIN }, [line(j, 100)], [{ label: SCENES[j].chip, icon: SCENES[j].icon, alpha: 100 }], 640);
  push({ faceOpts: GRIN_IN }, [line(j, 100)], [{ label: SCENES[j].chip, icon: SCENES[j].icon, alpha: 100 }], 60);
}

/* ------------------------------------------------------------------- build */

const tileFrames = await Promise.all(tileSeq.map((s) => tilePng(s.f)));
await sharp(tileFrames, { join: { animated: true } })
  .gif({ delay: tileSeq.map((s) => s.ms), loop: 0 })
  .toFile(join(outDir, "sagepilot-mark-animated.gif"));
writeFileSync(join(outDir, "sagepilot-mark.png"), await tilePng(OPEN));

// Full-logo lockup, same blink beat as the avatar tile
const lockupFrames = await Promise.all(tileSeq.map((s) => lockupPng(s.f)));
await sharp(lockupFrames, { join: { animated: true } })
  .gif({ delay: tileSeq.map((s) => s.ms), loop: 0, dither: 0, interFrameMaxError: 10 })
  .toFile(join(outDir, "sagepilot-logo-animated.gif"));
writeFileSync(join(outDir, "sagepilot-logo.png"), await lockupPng(OPEN));
await sharp(Buffer.from(faviconSvg)).png().toFile(join(outDir, "sagepilot-icon.png"));
await sharp(Buffer.from(linkedinSvg)).png().toFile(join(outDir, "icon-linkedin.png"));

// Inline (text-sized) logo — static only: at 15px tall a blink reads as a
// glitch, so the role line keeps a plain logo.
writeFileSync(join(outDir, "sagepilot-logo-inline.png"), await inlineLogoPng(OPEN));
console.log(
  "logo lockup:",
  `${LOCKUP_W}x${LOCKUP_H}`,
  "(display",
  `${Math.round(LOCKUP_W / 2)}x${Math.round(LOCKUP_H / 2)})`,
);

const heroFrames = [];
for (const s of heroSeq) heroFrames.push(await heroFrame(s.spec));
// interFrameMaxError enables transparency-based delta frames: only changed
// pixels are stored, which is what makes a 15-scene loop email-sized.
// dither:0 keeps static pixels byte-identical across frames so the delta
// encoding can actually drop them (dithering noise otherwise defeats it).
await sharp(heroFrames, { join: { animated: true } })
  .gif({
    delay: heroSeq.map((s) => s.ms),
    loop: 0,
    effort: 10,
    dither: 0,
    interFrameMaxError: 10,
    interPaletteMaxError: 8,
  })
  .toFile(join(outDir, "sagepilot-hero-animated.gif"));
writeFileSync(join(outDir, "sagepilot-hero.png"), await heroFrame(holdSpec(0)));

// Contact sheet of every scene in the hero loop, for reference/QA.
{
  const scale = 0.62;
  const w = Math.round(SW * scale);
  const h = Math.round(SH * scale);
  const gap = 10;
  const shots = [];
  for (let i = 0; i < SCENES.length; i++) {
    shots.push(
      await sharp(await heroFrame(holdSpec(i))).resize(w, h).png().toBuffer(),
    );
  }
  await sharp({
    create: {
      width: w + gap * 2,
      height: (h + gap) * SCENES.length + gap,
      channels: 4,
      background: "#FFFFFF",
    },
  })
    .composite(shots.map((input, i) => ({ input, left: gap, top: gap + i * (h + gap) })))
    .png()
    .toFile(join(outDir, "scenes-preview.png"));
  console.log("scenes sheet:", SCENES.length, "scenes");
}

/* ---- trust badges ----------------------------------------------------------
 * One PNG per badge (assets/badges/<id>.png) so the builder UI can mix and
 * match them; the signature lays the chosen ones out as a row of images.
 * Rendered at 2x (48px tall -> 24px display), quiet white pill + mint hairline
 * to match the hero's ActionChips.
 */
async function badgePill(icon, label) {
  const t = await text(label, { font: "Instrument Sans Medium 19", color: "#6F6F6F" });
  const padX = 14;
  const gap = 8;
  const h = 48;
  const iconSize = 24;
  const w = padX + iconSize + gap + t.w + padX;
  const inlineSvg = typeof icon === "string" ? icon : "";
  const bg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="12" fill="#FFFFFF" stroke="#DCEFE4" stroke-width="1.5"/>
    <g transform="translate(${padX} ${(h - iconSize) / 2})">${inlineSvg}</g>
  </svg>`;
  const overlays = [{ input: t.buf, left: padX + iconSize + gap, top: Math.round((h - t.h) / 2) }];
  if (typeof icon !== "string" && icon.png) {
    overlays.unshift({
      input: await appIcon(icon.png, iconSize),
      left: padX,
      top: Math.round((h - iconSize) / 2),
    });
  }
  const buf = await sharp(Buffer.from(bg)).composite(overlays).png().toBuffer();
  return { buf, w, h };
}

const ic = {
  shield: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l8 3v6c0 5.3-3.4 9.2-8 11-4.6-1.8-8-5.7-8-11V5l8-3z" fill="#179D5D"/><path d="M8.2 11.8l2.6 2.6 5-5.2" stroke="#FFFFFF" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  lock: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l8 3v6c0 5.3-3.4 9.2-8 11-4.6-1.8-8-5.7-8-11V5l8-3z" fill="#179D5D"/><rect x="8.4" y="11" width="7.2" height="6" rx="1.4" fill="#FFFFFF"/><path d="M9.9 11V9.6a2.1 2.1 0 0 1 4.2 0V11" stroke="#FFFFFF" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`,
  medal: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 13.5L6.5 22l5.5-3 5.5 3-2-8.5" fill="#179D5D" opacity="0.45"/><circle cx="12" cy="9" r="7" fill="#179D5D"/><path d="M9.3 9.1l1.9 1.9 3.5-3.6" stroke="#fff" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  g2: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#FF492C"/><text x="12" y="16.2" font-family="Instrument Sans" font-size="11" font-weight="700" fill="#FFFFFF" text-anchor="middle">G2</text></svg>`,
  star: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95L12 2.6z" fill="#F5A623"/></svg>`,
  pulse: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#E8FCF2"/><path d="M4.5 12.4h3.2l2.1-5 3 9.6 2.2-4.6h4.4" stroke="#179D5D" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  clock: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#179D5D"/><path d="M12 6.6V12l3.6 2.2" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  bolt: `<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#E8FCF2"/><path d="M13.2 3.8L6.6 13.4h4.3l-.9 6.6 6.6-9.6h-4.3l.9-6.6z" fill="#179D5D"/></svg>`,
};

// id -> label + icon. Add entries here and they show up in the builder UI.
const BADGE_CATALOG = [
  ["gdpr", "GDPR compliant", ic.shield],
  ["dpdp", "DPDP ready", ic.lock],
  ["soc2", "SOC 2 Type II", ic.lock],
  ["iso27001", "ISO 27001", ic.medal],
  ["g2", "Users love us", ic.g2],
  ["g2rating", "4.8 on G2", ic.star],
  ["uptime", "99.9% uptime", ic.pulse],
  ["support", "24/7 coverage", ic.clock],
  ["fastsetup", "Live in 48 hours", ic.bolt],
  ["shopify", "Shopify Partner", { png: "shopify" }],
];

mkdirSync(join(outDir, "badges"), { recursive: true });
const badgeManifest = {};
for (const [id, label, icon] of BADGE_CATALOG) {
  const b = await badgePill(icon, label);
  writeFileSync(join(outDir, "badges", `${id}.png`), b.buf);
  // display size is half the rendered size (2x assets)
  badgeManifest[id] = { label, w: Math.round(b.w / 2), h: Math.round(b.h / 2) };
}
writeFileSync(
  join(outDir, "badges", "manifest.json"),
  JSON.stringify(badgeManifest, null, 2),
);

// Keep the builder's badge list in sync automatically.
const builderPath = join(root, "signature-builder.html");
const builderSrc = readFileSync(builderPath, "utf8");
const block = `/* BADGES:START — generated by scripts/generate-assets.mjs, do not edit by hand */
const BADGES = ${JSON.stringify(badgeManifest, null, 2)};
/* BADGES:END */`;
const patched = builderSrc.replace(
  /\/\* BADGES:START[\s\S]*?\/\* BADGES:END \*\//,
  block,
);
if (patched !== builderSrc) {
  writeFileSync(builderPath, patched);
  console.log("builder badge manifest updated");
}
console.log("badges:", Object.keys(badgeManifest).join(", "));

// QA sheet: hero hold / typing / grin
await sharp({
  create: { width: SW + 16, height: SH * 3 + 32, channels: 4, background: "#FFFFFF" },
})
  .composite([
    { input: await heroFrame(holdSpec(0)), left: 8, top: 8 },
    {
      input: await heroFrame({
        base: { fieldPhase: 1, pulse: true, faceOpts: SHUT },
        lines: [line(1, 100)],
        chips: [{ typing: true, phase: 0, alpha: 100, dx: 0 }],
      }),
      left: 8,
      top: SH + 16,
    },
    { input: await heroFrame(holdSpec(1, GRIN)), left: 8, top: SH * 2 + 24 },
  ])
  .png()
  .toFile(join(outDir, "frames-preview.png"));

console.log("done");
