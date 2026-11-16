# DESIGN.md — ippon site

Design rules for `site/` (Astro + Starlight). Read this before changing the landing page or the docs theme.
The goal is an on-brand, restrained, editorial site that matches the product (the deck):
**black, one orange, big type, nothing decorative.**

## First principles

- **Show, don't tell.** The landing page leads with a real deck built by ippon (`site/demo/*.md`),
  next to the Markdown that produced it. Prefer showing the product over describing it.
- **One message per slide → one idea per screen.** The page mirrors the product's
  philosophy: subtraction over decoration. When in doubt, remove.
- **Spend boldness once.** The hero headline and the single orange primary action are the
  memorable things. Everything else stays quiet (white/grey on black, hairline rules).
- **Structure must inform, not decorate.** Borders, numbers and dividers are allowed only
  when they encode meaning (e.g. the Quick start steps are a real sequence → numbered).
- **No emoji. No decorative icons.** Hierarchy comes from type and space, not pictographs.

## Where things live

| Part | File |
|---|---|
| Landing page (both languages) | `src/components/Landing.astro`, copy in `src/landing.ts`, styles in `src/styles/landing.css` |
| Demo decks | `demo/en.md`, `demo/ja.md` (built by `scripts/demo.mjs`) |
| Docs theme (Starlight) | `src/styles/theme.css`, `src/components/SiteTitle.astro` |
| Docs content | the repo's `docs/` and `docs/en/` (see CLAUDE.md) |

## Palette (do not introduce new colors)

| Token | Value | Use |
|---|---|---|
| `--bg` / `--sl-color-black` | `#000000` | Page background (true brand black — not a tinted near-black). |
| `--fg` / `--sl-color-white` | `#ffffff` | Headings, key text. |
| `--fg-dim` / `--sl-color-gray-2` | `#c9c9c9` | Body copy. |
| `--muted` / `--sl-color-gray-3` | `#8a8a8a` | Secondary text, captions, nav. |
| `--accent` / `--sl-color-accent` | `#ff6a00` | The one bold color. Primary button, brand dot, step numbers, the pull-quote rule, the current demo slide and sidebar item, link underlines. Nothing else. |
| `--line` / `--line-soft` | white @ 14% / 7% | Hairline borders and separators. |

Greys are neutral (no blue tint). The docs also have a light theme (Starlight's toggle); it uses
the same neutrals inverted and a darker orange (`#d65500`) for contrast.

Do **not** use: tinted near-blacks (`#0b0b0d`, `#111`), extra accent colors, gradients, glows,
or filled "card" surfaces.

## Typography

- One family: the system sans, with Hiragino Sans / Noto Sans JP for Japanese. Mono for code only.
- Scale is fluid via `clamp()`. Hero `~2.75–5.25rem/800`, H2 `~1.6–2.4rem/700`, body `17px/1.7`.
- Headings use negative letter-spacing (`-0.02em`…`-0.04em`) and `text-wrap: balance`.
- Keep line length under ~68ch (`p { max-width: 68ch }`, ledes narrower).
- Avoid: all-caps labels, eyebrows, and coloring single words. Emphasis is plain bold, sparingly.

## Spacing & layout

- Section rhythm: `clamp(56px, 9vw, 104px)` vertical padding; sections separated by a single
  hairline top border.
- Content max width 1040px on the landing page.
- Lay content out like a document, not a template: features are a two-column list of name +
  one line (hairline above each, no boxes), the FAQ is plain questions and answers (all visible,
  no accordion), and the page ends with the footer (no closing CTA band repeating a headline).
- Corners are square (`border-radius` 2px at most; no pills). The nav is a solid black bar with a
  hairline, not a translucent blurred one. These are the tells of a generated landing page.
- Two-column blocks collapse to one column under 760–860px.

## Motion & accessibility

- Motion only answers an action (hover, the demo following the deck). No entrance animations, no glows.
- Smooth scrolling is gated behind `prefers-reduced-motion: no-preference`.
- Visible `:focus-visible` outline in the accent. Maintain contrast (white/#c9c9c9 on black).

## Copy

- Sentence case, active voice, plain verbs, no filler or hype.
- No stock marketing lines ("Yours, forever.", "each one earns its place", "Start now."). Say what
  the tool does; the philosophy lines come from the README.
- Be concrete and honest (e.g. name the real limitation: "same Wi-Fi", "subject to CORS").
- English and Japanese say the same things; update both.
