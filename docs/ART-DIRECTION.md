# Art direction

> Studio note: this is the shared design language. Paths below predate the monorepo: `src/theme`, `src/motion`, `src/components/{ui,app,charts}` are now `packages/{theme,motion,ui,charts}/src`, and `src/global.css` is `apps/<app>/src/global.css`.


Three OLED-first directions for Finance, built from App Store screenshots of 15 premium apps. Mocks of the Home screen are in `.review/directions/` (`compare.png` shows all six side by side); reference boards are in `.review/references/board-01…07.png`. Nothing in app code has changed; this document is the brief.

## 1. What the references do

| App | Black level / surfaces | What to borrow |
|---|---|---|
| Robinhood | True `#000`, no cards; hairlines only | One acid accent (`#CCFF00`-ish) carries all data; everything else is white or grey. Hero numbers are huge and tight. Line charts are a single glowing stroke. |
| Revolut | `#000` with graphite cards (`#1A1A1A`) and white type | Monochrome luxury: white glyphs on dark grey circles, colour reserved for card art and photography. Nothing is tinted at 15 %. |
| Nothing X | `#000` + `#1A1A1A` cards, one red accent | Radical restraint: monochrome icons, one accent, dot-matrix labels. Shows how much premium comes from removing colour. |
| Copilot Money | Deep navy-black (`#0B1121`), glowing category colours | Each category owns a saturated colour and a filled circle icon; charts in bright green/purple on near-black. The "neon on black" energy without being garish. |
| Cash App | Brand green full-bleed, black type | Black glyph on a solid saturated circle. The most legible icon treatment on any screen. |
| Linear | `#0F0F10`, rows separated by hairlines, tiny coloured glyphs | Density and typographic hierarchy; icons are small, monochrome, coloured only when they encode state. |
| Opal | Black with blurred photographic glass, luminous rings | Glass cards with a 1 px light rim; a single glow behind the hero number. |
| Flighty | Purple-black, glowing map lines | Glow under the active line; the rest of the chart stays dim. |
| Bevel | Light pastel gradients, ring gauges, colour-coded metrics | Rounded hero numerals; one gradient per metric. Reference for light mode and for Aurora. |
| Mercury | Lavender-tinted off-white, soft area charts | Light mode should be tinted, not `#F2F2F7` grey: warm or cool paper. |
| Gentler Streak | Full-bleed warm gradients, rounded type | Emotion through gradient and rounded numerals; too playful as a whole, right as a hero-glow idea. |
| (Not Boring) Weather | `#000`, 3D, red/cyan accents, condensed type | How bold a black UI can get while staying legible: two accents max, huge type, white outlines. |
| Things 3 | White, one blue accent, coloured list glyphs | Light-mode discipline; icon colour only on list glyphs. |
| Crouton | Flat full-colour screens | Per-section colour as identity (not adopted). |
| Arc Search | Pastel gradient haze | Gradient haze as background texture (Aurora light). |

Common to every premium dark app above: the background is true black or within 5 % of it; cards are either absent (hairlines), very dark (`#0E`–`#1A`) with a 1 px light rim, or glass; the accent appears in one or two places per screen; numbers are large, tight-tracked and tabular; icons are either white-on-solid-colour or monochrome, never a 15 % tint with a coloured glyph (that is the generic template look the owner is reacting to). Finance's current `#1C1C1E`/`#2C2C2E` cards sit at 11–17 % luminance, which is why it does not read as black.

## 2. The three directions

All three: `bg` is `#000000` in dark mode; cards never exceed 6 % luminance; separators are white at ≤ 10 % alpha; amounts stay `text` colour except income; tab bar is translucent black over content. Light mode is a tinted paper, not iOS grey.

### 2.1 Obsidian — monochrome luxury, one brass accent (recommended)

Pitch: Revolut and Nothing, with a warm metal accent that nods to the farthing coin. Colour is spent on category tiles and charts only; chrome is black, white and brass.

| Token | Dark | Light |
|---|---|---|
| `bg` | `#000000` | `#F4F2EE` |
| `surface` | `#0E0E10` | `#FFFFFF` |
| `elevated` | `#161618` | `#FFFFFF` |
| `border` (card rim) | `rgba(255,255,255,0.07)` | `rgba(20,18,14,0.07)` |
| `separator` | `rgba(255,255,255,0.06)` | `rgba(20,18,14,0.07)` |
| `text` | `#F7F6F2` | `#141311` |
| `text-secondary` | `#9D9CA3` | `#6C6A66` |
| `text-tertiary` | `#5F5F67` | `#A3A09A` |
| `accent` (fills, FAB, selection) | `#E2B96A` | `#C9A24F` |
| `accent-text` (links) | `#E2B96A` | `#9A7224` |
| `accent-soft` | `rgba(226,185,106,0.14)` | `rgba(201,162,79,0.14)` |
| `on-accent` | `#141210` | `#141311` |
| `income` | `#4FD08A` | `#1F8A4D` |
| `expense` | `#F0625D` | `#C8352F` |
| `warning` | `#E8A33D` | `#B8740E` |
| `fill` | `#18181B` | `#ECEAE4` |
| `overlay` / text | `#F4F2EE` / `#141311` | `#141311` / `#F4F2EE` |

Category palette, two ramps per key. `ink` is the solid tile fill (same in both schemes, white glyph on top). `lit` is for charts, swatches and text on black; `light-data` is for charts on paper.

| Key | ink (tile) | lit (dark data) | light-data | Key | ink (tile) | lit (dark data) | light-data |
|---|---|---|---|---|---|---|---|
| red | `#B83840` | `#E0565E` | `#C2434A` | cyan | `#237B9A` | `#44A9CC` | `#277F9F` |
| orange | `#C45C22` | `#E57A3A` | `#CC6425` | blue | `#3562C6` | `#5B86E0` | `#3764C4` |
| amber | `#B5841F` | `#DDA53A` | `#B98A1E` | indigo | `#514FBE` | `#7C7AE0` | `#5150B9` |
| lime | `#6A8C24` | `#9BBE43` | `#6F8F28` | purple | `#7A44B0` | `#A46BD4` | `#7C47B0` |
| green | `#2F8C5B` | `#4FBF80` | `#2F8E5C` | pink | `#B03C85` | `#D45FA6` | `#B13E86` |
| teal | `#22877C` | `#3FB8A9` | `#24897E` | brown | `#8A6648` | `#B48866` | `#8C6749` |
| gray | `#56565E` | `#86868E` | `#6E6E76` | | | | |

Icons: 36 pt **circle**, solid `ink` fill, white SF Symbol at `weight="semibold"`, `type="monochrome"`, 18 pt. Accounts use the same circle on `gray` ink with the account glyph; the selected account gets a 2 pt brass ring. Split badge stays as is. No tints, no gradients.

Type: SF Pro Display for everything; hero 44/50 weight 700 tracking −0.045 em (tighter than the spec's −0.8 pt); the "never rounded" rule stands. Cards radius 18, 1 px rim, no shadow (light: `0 1 2 rgba(20,18,14,0.04)`). Charts: current period white 2.5 pt with a 14 % white area; previous period `rgba(255,255,255,0.28)` dashed 3/4; end-dot brass; bars and donut use `lit`; selected bar brass.

### 2.2 Signal — bold neon on black

Pitch: Robinhood and Cash App energy. No cards at all, sections separated by hairlines, one acid lime accent that is also the income colour, categories as black glyphs on solid neon circles.

| Token | Dark | Light |
|---|---|---|
| `bg` / `surface` | `#000000` / `#000000` | `#FFFFFF` / `#FFFFFF` |
| `elevated` | `#0C0C0C` | `#F5F5F7` |
| `border` (stat tiles only) | `rgba(255,255,255,0.12)` | `rgba(0,0,0,0.14)` |
| `separator` | `rgba(255,255,255,0.10)` | `rgba(0,0,0,0.10)` |
| `text` / `secondary` / `tertiary` | `#FFFFFF` / `#8E8E93` / `#55555B` | `#000000` / `#6B6B70` / `#A0A0A6` |
| `accent` (fills, FAB, active tab) | `#C8FF4D` | `#C8FF4D` (fills only) |
| `accent-text` | `#C8FF4D` | `#2E7D00` |
| `on-accent` | `#000000` | `#000000` |
| `income` | `#C8FF4D` | `#2E7D00` |
| `expense` | `#FF4D6D` | `#D9304A` |
| `warning` | `#FFB020` | `#B86E00` |
| `fill` | `#141414` | `#F0F0F2` |

Category palette (same hex in both schemes, glyph is black): red `#FF4D6D`, orange `#FF7A1A`, amber `#FFC01F`, lime `#9BFF57`, green `#2CF28B`, teal `#19E3C1`, cyan `#26CCFF`, blue `#4D8AFF`, indigo `#7B6CFF`, purple `#B96BFF`, pink `#FF5BC8`, brown `#D9A066`, gray `#A0A0A8`.

Icons: 36 pt circle, solid neon fill, **black** SF Symbol at `weight="bold"`, 18 pt. Accounts: white glyph on `#141414` circle, selected gets a lime ring. Type: hero 56/60 weight 800 tracking −0.05 em; section headers are 17 pt 700 in `text`, not small caps. Radius 14 on the three stat tiles (1 px border, no fill); nothing else is a card. Charts: current period lime 2.5 pt plus a 6 pt 45 % blurred copy underneath (Skia `BlurMask`), 32 % lime area; previous period white 32 % dashed; bars solid lime with 40 % for inactive; donut uses the neon palette. Light mode keeps lime for fills with black text and uses `#2E7D00` wherever lime would be text.

### 2.3 Aurora — luminous glass

Pitch: Opal, Flighty, Bevel. Glass cards with a light rim, a violet-to-cyan glow behind the hero, gradient category tiles, rounded hero numerals.

| Token | Dark | Light |
|---|---|---|
| `bg` | `#000000` | `#F3F2FA` |
| `surface` | `rgba(255,255,255,0.055)` | `#FFFFFF` |
| `elevated` | `rgba(255,255,255,0.09)` | `#FFFFFF` |
| `border` (rim) | `rgba(255,255,255,0.09)` + inner top highlight `rgba(255,255,255,0.08)` | `rgba(60,50,120,0.06)` + shadow `0 2 14 rgba(70,60,140,0.08)` |
| `separator` | `rgba(255,255,255,0.07)` | `rgba(60,50,120,0.08)` |
| `text` / `secondary` / `tertiary` | `#F4F3FF` / `#A09FB5` / `#626176` | `#17162B` / `#6F6E88` / `#A6A5BC` |
| `accent` | `#8A7CFF` (gradient `#8A7CFF → #4FD6FF` on FAB and chart) | `#6C5CE7` |
| `accent-text` | `#A89CFF` | `#6C5CE7` |
| `income` / `expense` / `warning` | `#4FE3A3` / `#FF6E8E` / `#FFB454` | `#16A368` / `#E3486B` / `#C77A00` |
| `fill` | `rgba(255,255,255,0.08)` | `#ECEAF6` |
| hero glow | radial `rgba(110,80,255,0.55) → rgba(79,214,255,0.12) → 0` | same at 28 % / 10 % |

Category palette as 2-stop gradients (135°), same in both schemes; the second stop is the data colour for charts:

red `#FF8A93→#FF4D6D` · orange `#FFB36B→#FF7A1A` · amber `#FFDC7A→#FFB020` · lime `#D7F58A→#9BD932` · green `#7CF2BD→#22C784` · teal `#7AEDE1→#14B8A6` · cyan `#8DDCFF→#22B8F0` · blue `#8FB0FF→#3B6FFF` · indigo `#B1A6FF→#6C5CE7` · purple `#D2A6FF→#9B5CFF` · pink `#FFA1DD→#F0509B` · brown `#E2BF98→#A97E58` · gray `#C4C3D2→#7E7D8E`

Icons: 36 pt squircle radius 12, gradient fill via `expo-linear-gradient` (in Expo Go's bundled modules, `~57.0.2`; needs `npx expo install expo-linear-gradient`), inner top highlight 35 % white, white SF Symbol `weight="semibold"`. Type: heroes and stat values in a **rounded** face, weight 800. iOS exposes SF Pro Rounded only through `UIFontDescriptor`, which RN `Text` cannot request without a native module (not possible in Expo Go), so ship a rounded face (Nunito or Manrope) with `expo-font` for heroes only. This revises SPEC §5.3's "never rounded" rule for heroes only. Radius 22. Charts: current line gradient stroke `#9D8CFF→#4FD6FF` with an 8 pt blurred glow and 32 % area; previous white 30 % dashed; bars gradient per category.

## 3. Recommendation: Obsidian

- It is the only direction where the whole screen is within 6 % of black: the premium OLED feel the owner asked for comes from `#0E0E10` cards with a 1 px rim, not from colour.
- Colour is reserved for category tiles and data, so the Home screen reads as black, white and one metal, and the ink palette makes categories look designed rather than default.
- Brass is distinctive in the category (no expense tracker uses it), evokes the coin in the name, and works at both ends: `#E2B96A` on black and `#9A7224` on warm paper.
- White glyph on a solid ink circle is the Revolut/Cash App treatment, achievable today with `SymbolView` `type="monochrome"` and `weight="semibold"`; no new native modules.
- Light mode is strong without redesign (warm paper, same tiles).

Borrow from the others when implementing: Signal's chart glow is worth adopting for the pace line (Skia `BlurMask` under the current line, brass instead of lime); Aurora's gradient tiles are the fallback if the owner finds ink too quiet.

If the owner picks Signal, keep lime for the FAB, income and the current chart line only; never for text smaller than 13 pt in light mode. If Aurora, add `expo-linear-gradient`, and keep the glow to the Home hero and Insights total only.

## 4. Implementation notes (Obsidian)

Files, in order of blast radius. None of this touches screen code.

1. `src/global.css` `@layer theme`: replace the light and dark values of `--bg`, `--surface`, `--elevated`, `--hairline`, `--separator`, `--label*`, `--tint`, `--tint-soft`, `--positive`, `--negative`, `--caution`, `--fill`, `--overlay*`, `--primary-foreground` (`#141210`), `--accent-foreground`; add `--tint-text` (brass link colour, `#9A7224` light); replace `--cat-*` with the `lit` (dark) and `light-data` (light) ramps; add `--cat-*-ink` for the 13 tile fills (same in both schemes).
2. `src/theme/tokens.ts`: mirror the above in `colors` (add `accentText`, change `onAccent`), replace `categoryColors` with the ramps and add `categoryInk: Record<CategoryColorKey, string>`; `radii.card` 14 → 18, `radii.tile` 10 → 999 (circle); `typeScale.hero` to `{ size: 44, line: 50, weight: '700', tracking: -2 }`; `shadows.fab` to brass glow `rgba(226,185,106,0.25)`.
3. `src/theme/use-tokens.ts`: expose `ink` next to `category`.
4. `src/components/app/icon-tile.tsx`: background `ink[color]` at 100 %, `borderRadius: size / 2`, `SymbolIcon color="#FFFFFF" weight="semibold"`; remove `withAlpha` tinting; split badge border uses `colors.surface`.
5. `src/components/app/chip.tsx` and `src/features/transaction-form/chips.tsx`: selected state uses `accent-soft` with a 1 px brass border rather than a filled blue pill; the mini icon in quick-add chips is a 22 pt ink circle.
6. Charts (`src/components/charts/pace-chart.tsx`, `bar-chart.tsx`, `mini-bars.tsx`, `paired-bars.tsx`, `donut.tsx`): default `tint` stays `colors.accent` (now brass) for selection; the pace line's current period is `colors.text` with a 14 % area and brass end-dot, previous period `withAlpha(colors.text, 0.28)` dashed; category series use `category` (`lit`), never `ink`. Add an optional `BlurMask` glow under the current line, off when Reduce Motion is on.
7. Cards in dark mode get the 1 px `border` rim (SPEC §5.4 currently says no border in dark); shadows stay off.
8. Tab bar: inactive `text-tertiary`, active `text` (not accent); FAB becomes a brass "+ Add" pill, `on-accent` text.
9. `docs/SPEC.md` §5: rewrite §5.1 and §5.2 with the tables above, §5.3 hero row, §5.4 radii (card 18, tile circle) and the dark-mode rim rule; §5.7 row anatomy tile note (36 pt circle).
10. Verify in Expo Go on the device: `expo-symbols` supports `type` monochrome/hierarchical/palette/multicolor and weights ultraLight…black (`node_modules/expo-symbols/build/SymbolModule.types.d.ts`); only monochrome + semibold is needed here.

Mock sources are in `.review/directions/src/` (`mock.html?d=obsidian|signal|aurora&mode=dark|light`, `render.mjs`), rendered with Playwright at 393×852 @3x.

## 5. Home v3 + palette refinement

Owner feedback after living with Obsidian on the device: Home still feels dated, the chart is cluttered, the section order is wrong, the colours are "off, not premium", and the app needs a medium amount of motion everywhere. Two Home layouts and a refined palette are mocked in `.review/home-options/` (`A-focus-brass`, `A-focus-ivory`, `B-bento`, each with a `-full` scroll; `compare.png`; `palette.png`). Sources: `.review/home-options/src/mock.html` (`?l=focus|bento&p=brass|ivory`), `render.mjs`, `compare.mjs`; Phosphor icons are inlined from the local `@iconify-json/ph` data, Inter stands in for SF. No app code changed.

Quick add, in both layouts: chips carry **no amount**. They are the most frequent `title + category` pairs across all transactions (top 6, ties broken by recency); a tap opens the add sheet with title and category prefilled and the keypad focused. Chip anatomy: 40 pt pill, `surface` fill, 1 px rim, 26 pt ink circle with a 14 pt white duotone glyph, 14 pt/600 title. A 11 pt uppercase "Quick add" eyebrow in `text-tertiary` sits above the row; no "see all".

### 5.1 Layout A, "Focus" (recommended)

One hero on bare black; everything below it is quiet. Order, top to bottom (16 pt gutters, 361 pt content):

| # | Section | Spec |
|---|---|---|
| 1 | Header, 44 pt | Left: `Friday 16 Oct · 15 days left`, 13 pt, day in `text`/600, rest `text-secondary`/500, 3 pt dot separator. Right: 34 pt settings circle (`surface`, rim, Phosphor `gear-six` 18 pt in `text-secondary`). No large title. |
| 2 | Hero, +22 pt | "Spent in October" 15 pt/500 `text-secondary`; amount 54/60 weight 700 tracking −0.045 em, `₹` at 44 pt/600 same colour; delta row 13 pt: a 22 pt mint pill (`income` on `income` 12 %) with `arrow-down-right` + "8% under", then "September pace · ₹52,310 by now" in `text-secondary`. |
| 3 | Chart, 128 pt, +18 pt | Cumulative month-to-date, monotone-cubic smoothed. Current month: accent stroke 2.25 pt, area gradient accent 22 % → 3 % at 75 % → 0. Last month: solid `rgba(255,255,255,0.20)` 1.25 pt ghost for the full month (not dashed). End-dot: 5 pt accent disc, 2.5 pt `bg` ring, 18 pt radial halo (accent 60 % → 18 % at 45 % → 0). **No** gridlines, axis numbers, legend or line glow. Two labels only, 11 pt `text-tertiary`: `1 Oct` and `31 Oct`. Before day 7 the ghost line carries the chart; that is fine. |
| 4 | Quick add, +22 pt | As above. |
| 5 | Stats strip, +20 pt | One card, three columns divided by hairlines: Earned (`income`), Daily avg, Balance. Key 12 pt `text-secondary`, value 17 pt/700 tracking −0.025 em. |
| 6 | Coming up, +26 pt | 15 pt/600 header with "All ›" link. One card, two 62 pt rows: next bill (ink circle, title, "Mon 20 Oct · in 4 days", amount + "Monthly"); budgets (36 pt accent ring at % used, "₹18,200 left of ₹35,000", "48%" + "used"). Replaces the Upcoming and Budgets sections. |
| 7 | Top categories | Header + "Insights ›". Card, 4 rows: ink circle, name, a 3 pt bar (`lit` colour on white 6 % track) in place of the subtitle, amount + percentage. The stacked bar is gone. |
| 8 | Recent | Header + "All ›". Card, 4 rows, existing row anatomy. Income rows show `+` in `income`. |

Cards: radius 20, `surface`, 1 px rim, `inset 0 1 0 rgba(255,255,255,0.035)` top highlight, no shadow. Section headers are 15 pt/600 `text`, not small caps. Tab bar: active tab `text`, inactive `text-tertiary`, Phosphor regular (home filled when active). FAB: accent pill "+ Add".

### 5.2 Layout B, "Bento"

Same header, then a 2-column grid (gap 10, tile radius 22, padding 16, same rim and top highlight), then quick add, then Recent (5 rows). Tiles are glanceable widgets: 13 pt key, 22 pt/700 value, 12 pt `text-tertiary` sub-line.

| Tile | Size | Content |
|---|---|---|
| Spent in October | wide, ~250 pt | Key row with "↘ 8% under Sep" at right in `income`; 40/46 amount; 84 pt chart (same spec as A, no halo change); `1 Oct`/`31 Oct`. |
| Earned | 1 × 1 | `+₹1,45,000` in `income`, "Salary · 1 Oct", 12 thin bars (last 12 months, 28 % alpha, current 100 %) pinned to the foot. |
| Left to spend | 1 × 1 | `₹18,200` + "of ₹35,000" beside a 60 pt accent ring (5 pt) with "52%" inside; foot "15 days · ₹1,213 / day". |
| Top category | 1 × 1 | 40 pt ink circle, `₹32,000`, "Housing · 67% of spend". |
| Next bill | 1 × 1 | 40 pt ink circle with "in 4 days" at right, `₹649`, "Netflix · Mon 20 Oct". |

Each tile is a deep link (Insights, Budgets, the category, the recurring item). Bento is the better fit if the owner wants a dashboard; Focus is the better fit for a tracker used ten times a day, because the quick-add row is one thumb-move from the top and the page has a single reading order.

### 5.3 Palette audit and refined tokens

What was off, measured in OKLCH:

- **Neutrals had a cool-violet cast** (`surface`, `fill`, `text-secondary`, `text-tertiary` all at hue 286–293°) under a warm white (`text` h 95°) and a warm accent (h 83°). Mixed temperatures read as "slightly wrong". All neutrals now share hue 80–90° at chroma ≤ 0.009.
- **Brass was mustard**: `#E2B96A` is L 0.81 C 0.11. Refined `#DEC084` is L 0.82 C 0.085: lighter, less yellow, closer to champagne-brass. `brass-deep #BA904C` is the pressed state and the light-mode fill.
- **Category inks were uneven**: L ranged 0.49 (indigo) to 0.65 (amber), chroma 0.09–0.17, and hue gaps ranged 15° (blue→indigo) to 46° (lime→green). Refined inks sit at L 0.58 (orange 0.62, amber 0.66, lime 0.64 so yellows stay yellow rather than olive), C 0.16 (gamut-fitted for teal/cyan), hues 22°, 50°, 80°, 118°, 150°, 184°, 222°, 256°, 282°, 308°, 345°. Every white glyph keeps ≥ 3.2:1; every data colour ≥ 9:1 on black.
- **Income shared green's hue** (both 156°) and **warning sat 10° from brass**. Income moves to mint (162°, `#64D8A4`) and is used only for the Earned value, the delta pill and `+` amounts, never as a tile; warning moves to 58° (`#FA9947`).

Dark:

| Token | Current | Refined | Token | Current | Refined |
|---|---|---|---|---|---|
| `bg` | `#000000` | `#000000` | `accent` (brass) | `#E2B96A` | `#DEC084` |
| `surface` | `#0E0E10` | `#100F0D` | `accent-deep` (pressed) | – | `#BA904C` |
| `elevated` | `#161618` | `#191816` | `accent-soft` | 14 % brass | `rgba(222,192,132,0.14)` |
| `fill` | `#18181B` | `#1E1D1A` | `on-accent` | `#141210` | `#15120B` |
| `border` / `separator` | 7 % / 6 % white | unchanged | `income` | `#4FD08A` | `#64D8A4` |
| `text` | `#F7F6F2` | `#F8F7F2` | `income-soft` | – | `rgba(100,216,164,0.12)` |
| `text-secondary` | `#9D9CA3` | `#A4A19B` | `expense` | `#F0625D` | `#F66C6D` |
| `text-tertiary` | `#5F5F67` | `#686660` | `warning` | `#E8A33D` | `#FA9947` |

Light (paper stays warm; tiles use the same `ink` in both schemes):

| Token | Refined | Token | Refined |
|---|---|---|---|
| `bg` | `#F5F3EF` | `accent` (fills) | `#C69E58` |
| `surface` / `elevated` | `#FFFFFF` | `accent-text` (links) | `#936923` |
| `fill` | `#EAE8E3` | `income` | `#048B56` |
| `text` | `#161310` | `expense` | `#C92F36` |
| `text-secondary` | `#66635D` | `warning` | `#C9690C` |
| `text-tertiary` | `#9B9891` | `border` / `separator` | `rgba(22,19,16,0.07)` |

Category ramps (`ink` = tile fill in both schemes, `lit` = data on black, `light-data` = data on paper):

| Key | ink | lit | light-data | Key | ink | lit | light-data |
|---|---|---|---|---|---|---|---|
| red | `#C6484C` | `#FE8A88` | `#B34C4D` | cyan | `#0786A5` | `#54C1E3` | `#007E9C` |
| orange | `#CD6108` | `#F7945A` | `#AE5517` | blue | `#2E78D5` | `#7CB4FE` | `#3672BE` |
| amber | `#BE8700` | `#F3B94C` | `#AE7C04` | indigo | `#6D68D3` | `#A5A7FE` | `#6765BD` |
| lime | `#859700` | `#B6CA59` | `#7A8A10` | purple | `#935AC0` | `#CA98F5` | `#8759AD` |
| green | `#009241` | `#73C786` | `#238744` | pink | `#B74A8E` | `#EF8BC5` | `#A74D83` |
| teal | `#008C80` | `#56C7B8` | `#008478` | brown | `#917257` | `#C7A384` | `#826144` |
| gray | `#65635F` | `#A19E99` | `#7D7A75` | | | | |

Icons move to **Phosphor**: duotone for category circles (white, the duotone layer gives a built-in 20 % tonal fill), regular for chrome, bold for small arrows and carets, fill for the active tab. Category map: food `fork-knife`, groceries `shopping-cart-simple`, transport `car-profile`, shopping `shopping-bag`, housing `house-line`, bills `lightning`, subscriptions `arrows-clockwise` (merchant override: Netflix `monitor-play`), health `heartbeat`, entertainment `popcorn`, travel `airplane-tilt`, education `graduation-cap`, personal `sparkle`, income `bank`; tabs `house-simple`, `receipt`, `chart-pie-slice`, `gauge`; settings `gear-six`.

**Alternative accent, "Ivory"** (`A-focus-ivory`): accent `#F1EEE6`, `on-accent` `#0B0A08`, links in `text-secondary`, chart line and halo ivory, FAB an ivory pill, budget ring ivory. It is the Revolut/Nothing register: the screen becomes black, white and the category inks only, and nothing competes with the data. It is the most premium-looking of the options I tried (champagne reads as brass-lite, ice blue fights the cyan/blue inks and feels like a utility app). Recommendation: ship **refined brass**; it keeps the coin story and the warm neutrals now make it feel intentional. Keep ivory as a one-token switch (`accent` + `on-accent` + `link`) if the owner still finds brass loud after a week.

### 5.4 Motion notes (medium)

Shared: springs `snappy = { damping 22, stiffness 320, mass 0.9 }` for presses, `settle = { damping 20, stiffness 180 }` for layout and entrances; easings `easeOutQuint` for draws. Every entrance respects Reduce Motion (fall back to a 150 ms fade). Nothing loops.

Layout A, Focus:

1. Hero count-up: 0 → amount, 650 ms `easeOutQuint`, tabular digits so the width is stable; delta pill fades + rises 6 pt after 300 ms (220 ms).
2. Chart draw: current line trims 0 → 1 over 700 ms `easeOutQuint` starting at 120 ms, area fades in under it (300 ms, starting at 400 ms), ghost line fades to 20 % over 400 ms; end-dot scales 0 → 1 with `snappy` when the draw finishes, halo pulses once (opacity 0 → 0.6 → 0.35, 500 ms) and then stays.
3. Staggered entrance: quick-add row, stats strip, Coming up, Top categories, Recent each slide up 12 pt + fade with `settle`, 55 ms apart, starting at 200 ms. Chips inside the row stagger a further 30 ms each.
4. Chip press: scale 0.94 with `snappy`, release overshoots to 1; on tap the sheet opens and the chip's mini circle morphs into the sheet's category tile (shared-element style, 320 ms `settle`).
5. Category bars grow from 0 to their width over 500 ms `easeOutQuint`, 40 ms stagger, when the card scrolls into view (once).
6. Budget ring in Coming up sweeps 0 → 48 % over 600 ms with the same timing as the bars.
7. Pull-to-refresh / month change: hero number re-counts from the old value (350 ms), chart cross-fades (200 ms) then redraws.
8. Row press: existing 0.97 scale; swipe actions unchanged.

Layout B, Bento:

1. Tiles enter in reading order (wide, Earned, Left, Top, Next): scale 0.96 → 1 + fade, `settle`, 60 ms apart.
2. Wide tile: count-up and chart draw as in A, but the chart starts with the tile's entrance.
3. Earned mini-bars rise from the baseline, 25 ms stagger, 400 ms; the current bar lands last.
4. Left-to-spend ring sweeps 600 ms; the percentage counts up alongside.
5. Tile press: scale 0.97 `snappy`, haptic `light`, then navigates with the tile expanding into the destination header (Expo Router shared transition where available, otherwise a 240 ms fade).
6. Quick add and Recent as in A.

Elsewhere in the app (to hit "every part"): sheet open uses `settle` with a 6 pt overshoot; keypad keys scale 0.92 with `snappy` and the amount digits roll in from below (120 ms); list rows animate layout on insert/delete (`LinearTransition.springify()`); tab switch cross-fades the icon fill (150 ms); toasts slide up with `settle`; segmented controls move the thumb with `snappy`; Insights donut sweeps 700 ms and bars grow 500 ms with 40 ms stagger.
