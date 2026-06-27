# LogLens — Visual Redesign Spec

**Direction: Log Format (B)**
**Date: 2026-06-27**
**Status: Approved**

---

## 1. Intent

Replace the current generic dark-UI aesthetic (glow gradients, pill kickers, pulsing dots, fade-up everywhere) with a dense, industrial SRE-tool feel. The mood: an engineer looking at a real observability dashboard at 2am. Every visual decision should feel deliberate and purposeful, not decorative.

Scope: visual layer only. No changes to routing, API calls, state management, or business logic.

---

## 2. Design Tokens

### Color palette

| Token | Value | Role |
|---|---|---|
| `--color-ink` | `#060b10` | Page background |
| `--color-ink-deep` | `#030508` | Input/terminal surfaces |
| `--color-surface` | `#0a1018` | Card / panel background |
| `--color-surface-2` | `#0e1520` | Panel headers, secondary surfaces |
| `--color-raised` | `#121d28` | Hover / elevated state |
| `--color-line` | `#172030` | Default border |
| `--color-line-strong` | `#1e2d40` | Emphasized border |
| `--color-fg` | `#dde0e8` | Primary text |
| `--color-fg-muted` | `#8896aa` | Secondary text |
| `--color-fg-faint` | `#4a5668` | Tertiary / placeholder |
| `--color-signal` | `#c4f135` | Accent (unchanged) |
| `--color-high` | `#f76d6d` | High severity (unchanged) |
| `--color-medium` | `#f3b340` | Medium severity (unchanged) |
| `--color-low` | `#54aef5` | Low severity (unchanged) |

Background: solid `#060b10`, no radial gradients. Optional: subtle dot grid at 1% opacity (18px × 18px), no glow.

### Typography

| Role | Family | Weight | Size | Notes |
|---|---|---|---|---|
| Heading | Barlow Condensed | 800 | 28–52px | ALL CAPS, tight letter-spacing |
| Subheading | Barlow Condensed | 700 | 14–20px | ALL CAPS, letter-spacing 0.05–0.1em |
| Label / kicker | Barlow Condensed | 600 | 9–11px | ALL CAPS, letter-spacing 0.2–0.3em |
| Body | Epilogue | 400 | 12–13px | line-height 1.55 |
| Code / mono | JetBrains Mono | 400–500 | 9–11px | log lines, paths, timestamps |

Google Fonts URL to add: `Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,400&family=Epilogue:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700`

### Radius

All UI elements use 1–4px radius. No `rounded-xl` or `rounded-2xl` on panels/cards. Terminals use `rounded-sm` (2px) or `rounded` (4px).

### Spacing

Denser than current. Main content padding: `px-5 py-4` on cards, `px-6 py-5` on page body. Nav height: 44px.

---

## 3. Component Inventory

### Nav (`Layout.tsx`)

- Height 44px, full-width, `background: var(--color-ink)`, bottom border `var(--color-line)`
- Wordmark: `LOGLENS` in Barlow Condensed 800, letter-spacing 0.18em — the `LENS` part in `--color-signal`
- Logo: SVG magnifier icon, 22px, stroke `--color-signal`
- Nav links: Barlow Condensed 600, 10px, letter-spacing 0.18em, ALL CAPS. Active state: `background: rgba(196,241,53,0.08); color: var(--color-signal)`, radius 2px
- Status: 6px pip + `READY` text in mono 9px, both `--color-signal`

### Analyze page (`AnalyzePage.tsx`)

**Hero (above input):**
- Two-column asymmetric grid. Left: headline + subtext. Right: numbered step list (01–04).
- Headline: Barlow Condensed 800, 44–52px, ALL CAPS, `--color-fg`. No decorative slashes or em-dashes.
- Sub: Epilogue 400, 12px, `--color-fg-faint`, max 34ch.
- Step list: number in Barlow Condensed 800 22px + label in Barlow Condensed 600 9px ALL CAPS.

**Input terminal:**
- Background `--color-ink-deep`, border `--color-line`, radius 3–4px
- Titlebar: `--color-surface`, border-bottom `--color-line`, height 32px. Left: 3 pips (8px circles, only first one `--color-signal` when content present). Center: mono path `stdin · N chars · idle`. Right: "UPLOAD FILE" Barlow Condensed 600 label in a border box.
- Body: mono 10px, `--color-fg-faint`, line-height 1.75, min-height 90px. Placeholder text: `# paste log or stack trace here`. Real text: `--color-fg-muted`.
- Statusbar: `--color-surface`, border-top `--color-line`. Left: example chips (Barlow Condensed 600, border `--color-line`). Right: kbd hint `⌘↵` + CTA button.
- CTA: Barlow Condensed 800, 11px, letter-spacing 0.18em, ALL CAPS, `background: --color-signal`, `color: --color-ink-deep`, radius 2px, `px-4 py-1.5`.

**Scanning loader (`ScanningLoader`):**
- Remove the `rounded-2xl border border-line/70 bg-surface/50 px-6 py-7` panel
- New: flat row inside the statusbar area: pip (6px, `--color-signal`, pulsing) + "SCANNING LOG FILE" Barlow Condensed text + "Cancel" mono link
- Scan bar: 2px `--color-line` base, `--color-signal` sliding fill, 100% width below the input

### Report / Analysis detail (`ReportView.tsx`)

**Header strip:**
- `--color-surface-2` background, border-bottom `--color-line`, height ~40px
- Left: "ANALYSIS RESULT" kicker (Barlow Condensed 600, 9px, letter-spacing 0.3em, `--color-fg-faint`) — no pulsing dot
- Right: severity badge (Barlow Condensed 700, 10px, ALL CAPS, tight border, appropriate color) + timestamp mono 9px + "OPEN FULL →" link

**Report title:** Barlow Condensed 800, 22–28px, ALL CAPS, `--color-fg`

**Key log lines panel:**
- Background `--color-ink-deep`, border `--color-line`, radius 3px
- Header: "KEY LOG LINES" Barlow Condensed 700, 9px, letter-spacing 0.2em. Background `rgba(196,241,53,0.04)`.
- Body: `<pre>` mono 9px, `rgba(196,241,53,0.55)`, line-height 1.7

**Causes / Debug panels:**
- 2-column grid, background `--color-surface`, border `--color-line`
- Panel header: Barlow Condensed 700, 9px, letter-spacing 0.2em, `--color-fg-faint`. Background `--color-surface-2`.
- Items: bullet dot 4px `--color-signal` for causes; numbered circle (16px, `rgba(196,241,53,0.08)` bg, mono 8px `--color-signal` text) for debug steps
- Item text: Epilogue 10px, `--color-fg-muted`

**Bug report markdown toggle:**
- Same `<details>/<summary>` pattern but summary uses Barlow Condensed 600, 9px, `--color-fg-faint`

### Severity badge (`SeverityBadge.tsx`)

- Barlow Condensed 700, 10px, letter-spacing 0.15em, ALL CAPS
- Dot: 4–5px circle, current color
- Border: 1px solid `rgba(color, 0.2)`, background `rgba(color, 0.10)`, radius 2px
- No `rounded-full` pill shape — use `rounded-sm` (2px)

### History page (`HistoryPage.tsx`)

- Page header: kicker "INCIDENT LOG" in signal + "PAST ANALYSES" Barlow Condensed 800 28px + count mono 10px `--color-fg-faint`
- Table layout (no card grid): column headers in Barlow Condensed 600 8px ALL CAPS `--color-fg-faint`
- Columns: Severity | Issue (title) | Category | Date | Arrow
- Row hover: `background: --color-surface`, border `--color-line` fades in, no border-left accent
- Empty state: icon circle + "NO RECORDS YET" Barlow Condensed + Epilogue body + "Analyze a log →" signal link

### Error state

- `background: rgba(247,109,109,0.06)`, `border: 1px solid rgba(247,109,109,0.18)`, radius 3px
- "✕" mono icon + Epilogue error message + mono hint below

---

## 4. CSS Changes (`index.css`)

1. Replace font tokens: `--font-sans` → Epilogue; add `--font-head` → Barlow Condensed
2. Update color tokens to new palette (darker ink, cooler surfaces)
3. Remove radial gradient background; keep optional dot grid at very low opacity
4. Remove `--animate-fade-up` — no fade-up used in redesign
5. Keep `--animate-scan` and `--animate-pulse-dot`
6. Add `color-scheme: dark` on `html`

---

## 5. Implementation Plan

Three parallel agents:

**Agent 1 — Tokens + Shell**
- `index.css`: new tokens, background, font stack, base styles
- `index.html`: updated Google Fonts URL (Barlow Condensed + Epilogue)
- `Layout.tsx`: new nav (wordmark, logo SVG, condensed links, status pip)

**Agent 2 — Analyze + Report**
- `AnalyzePage.tsx`: hero grid, terminal input, scanning loader, CTA
- `ReportView.tsx`: header strip, title, key lines panel, causes/debug grid, badge
- `SeverityBadge.tsx`: new badge shape

**Agent 3 — History + Detail**
- `HistoryPage.tsx`: page header, table rows, hover, empty state
- `AnalysisDetailPage.tsx`: align with ReportView tokens, page-level header

After all three: verify in browser, fix regressions.

---

## 6. Anti-patterns to avoid

- No `border-l-*` colored accents (absolute ban)
- No gradient text (`background-clip: text`)
- No `rounded-full` on badge/chip shapes
- No `animate-fade-up` on every element
- No radial glows or glassmorphism
- No em-dashes in copy
