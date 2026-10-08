// Source of the app logo: a brass coin holding a tide of brass water with the "today" dot on its surface,
// the same story as the Home hero chart. `render.mjs` turns these SVGs into the PNGs app.json points at.

const BRASS = ['#F3DDA6', '#DEC084', '#BA904C', '#8A6630'];

/** Wave surface across the coin: two summed sines, sampled every 2 units, as an SVG path fragment. */
function surface(cx, r, level, amp) {
  const pts = [];
  for (let x = cx - r - 4; x <= cx + r + 4; x += 2) {
    const t = (x - (cx - r)) / (2 * r);
    const y = level + amp * Math.sin(t * Math.PI * 2.1 + 0.6) + amp * 0.45 * Math.sin(t * Math.PI * 4.3 + 1.9);
    pts.push(`${x.toFixed(1)} ${y.toFixed(2)}`);
  }
  return pts;
}

/**
 * The mark centred on (512, 512) with outer radius `r`. `mono` draws a single-colour silhouette (Android
 * themed icon); otherwise the full brass rendering.
 */
export function mark({ r = 330, mono = false } = {}) {
  const cx = 512;
  const cy = 512;
  const ring = r * 0.085;
  const inner = r - ring * 1.9;
  const level = cy + inner * 0.12;
  const amp = inner * 0.06;
  const wave = surface(cx, inner, level, amp);
  const back = surface(cx, inner, level - inner * 0.09, amp * 1.3).map((p) => {
    const [x, y] = p.split(' ').map(Number);
    return `${x} ${(y + amp * 0.6 * Math.sin(x / 37)).toFixed(2)}`;
  });
  const body = `M ${wave.join(' L ')} L ${cx + inner + 4} ${cy + inner + 4} L ${cx - inner - 4} ${cy + inner + 4} Z`;
  const backBody = `M ${back.join(' L ')} L ${cx + inner + 4} ${cy + inner + 4} L ${cx - inner - 4} ${cy + inner + 4} Z`;
  // Today dot sits on the surface a little left of centre.
  const dotX = cx - inner * 0.28;
  const t = (dotX - (cx - inner)) / (2 * inner);
  const dotY = level + amp * Math.sin(t * Math.PI * 2.1 + 0.6) + amp * 0.45 * Math.sin(t * Math.PI * 4.3 + 1.9);
  const dotR = r * 0.075;

  if (mono) {
    return `
  <defs><clipPath id="coin"><circle cx="${cx}" cy="${cy}" r="${inner}"/></clipPath>
  <mask id="cut"><rect width="1024" height="1024" fill="#fff"/><circle cx="${dotX}" cy="${dotY}" r="${dotR + r * 0.035}" fill="#000"/></mask></defs>
  <circle cx="${cx}" cy="${cy}" r="${r - ring / 2}" fill="none" stroke="#fff" stroke-width="${ring}"/>
  <g clip-path="url(#coin)" mask="url(#cut)"><path d="${body}" fill="#fff"/></g>
  <circle cx="${dotX}" cy="${dotY}" r="${dotR}" fill="#fff"/>`;
  }

  return `
  <defs>
    <linearGradient id="brass" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="${BRASS[0]}"/><stop offset="0.45" stop-color="${BRASS[1]}"/><stop offset="1" stop-color="${BRASS[2]}"/>
    </linearGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BRASS[1]}" stop-opacity="0.95"/>
      <stop offset="0.35" stop-color="${BRASS[2]}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${BRASS[3]}" stop-opacity="0.35"/>
    </linearGradient>
    <radialGradient id="face" cx="0.38" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#2A241A"/><stop offset="1" stop-color="#0E0D0B"/>
    </radialGradient>
    <radialGradient id="caustic" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFF1D2" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF1D2" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${r * 0.03}"/></filter>
    <clipPath id="coin"><circle cx="${cx}" cy="${cy}" r="${inner}"/></clipPath>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#brass)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - ring}" fill="#0B0A08"/>
  <circle cx="${cx}" cy="${cy}" r="${inner}" fill="url(#face)"/>
  <circle cx="${cx}" cy="${cy}" r="${r - ring * 1.45}" fill="none" stroke="${BRASS[1]}" stroke-opacity="0.28" stroke-width="${r * 0.008}"/>
  <g clip-path="url(#coin)">
    <path d="${backBody}" fill="${BRASS[1]}" fill-opacity="0.16"/>
    <path d="${body}" fill="url(#water)"/>
    <ellipse cx="${cx + inner * 0.22}" cy="${level + inner * 0.18}" rx="${inner * 0.55}" ry="${inner * 0.26}" fill="url(#caustic)"/>
    <path d="M ${wave.join(' L ')}" fill="none" stroke="${BRASS[0]}" stroke-width="${r * 0.04}" stroke-opacity="0.35" filter="url(#glow)"/>
    <path d="M ${wave.join(' L ')}" fill="none" stroke="#FBEBC4" stroke-width="${r * 0.022}" stroke-linecap="round"/>
  </g>
  <circle cx="${dotX}" cy="${dotY}" r="${dotR + r * 0.03}" fill="#0B0A08"/>
  <circle cx="${dotX}" cy="${dotY}" r="${dotR}" fill="url(#brass)"/>`;
}

/** Full-bleed square icon (iOS applies its own mask). */
export function appIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><radialGradient id="bg" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="#1A1610"/><stop offset="0.6" stop-color="#070605"/><stop offset="1" stop-color="#000"/></radialGradient></defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>${mark({ r: 360 })}
</svg>`;
}

/** Android adaptive foreground: transparent, mark inside the 66% safe zone. */
export function androidForeground() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${mark({ r: 250 })}</svg>`;
}

export function androidMonochrome() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${mark({ r: 250, mono: true })}</svg>`;
}

export function androidBackground() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#000"/></svg>`;
}
