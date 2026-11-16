# DESIGN.md — ippon site

Design rules for `site/` (Astro + Starlight). Read this before changing the home page or the docs theme.
The reference is the VitePress look of [hono.dev](https://hono.dev) and [sli.dev](https://sli.dev):
**a dark grey page, one orange, a short home page, and plain, readable docs.**

## First principles

- **Show, don't tell.** The home hero shows the editor (`slide.md`) on top of the real deck that ippon
  built from it (`site/demo/*.md`), kept in sync. Prefer showing the product over describing it.
- **The home page is short.** Hero → feature cards → license line. Explanations, the philosophy and
  the FAQ-style details live in the docs, not on the home page.
- **One site, one frame.** The home page is a Starlight page (splash template), so the header, search,
  theme toggle and language picker are the same as in the docs.
- **Docs are for reading.** Headings are medium weight (600), each h2 has a hairline above it, links are
  orange without an underline (underline on hover), code blocks have no terminal "window dots".
- **No stock marketing copy.** Say what the tool does in plain words ("Yours, forever." and
  "each one earns its place" are out).

## Where things live

| Part | File |
|---|---|
| Home page | `src/pages/index.astro`, `src/pages/ja/index.astro` (`StarlightPage`, splash) |
| Home hero + demo | `src/components/Hero.astro` (overrides Starlight's `Hero`; only pages with `hero` use it) |
| Feature cards + license line | `src/components/Features.astro` |
| Home copy (both languages) | `src/landing.ts` |
| Demo decks | `demo/en.md`, `demo/ja.md` (built by `scripts/demo.mjs`) |
| Theme (colors, docs typography) | `src/styles/theme.css`, `src/components/SiteTitle.astro` |
| Docs content | the repo's `docs/` and `docs/en/` (see CLAUDE.md) |

## Palette

| Token | Dark | Use |
|---|---|---|
| `--sl-color-black` | `#1b1b1f` | Page, nav and sidebar background (VitePress dark). |
| `--sl-color-gray-6` | `#202127` | Cards, inline code, the editor window. |
| `--sl-color-gray-5` | `#3c3f44` | Borders, the secondary button. |
| `--sl-color-gray-3` | `#98989f` | Secondary text. |
| `--sl-color-gray-2` | `#dfdfd6` | Body text. |
| `--sl-color-white` | `#fffff5` | Headings. |
| `--sl-color-accent` | `#ff6a00` | The one color: the name "ippon", the primary button, links, icons, the current sidebar item. |

Light theme: white background, `#f6f6f7` surfaces, orange `#d65500`. The embedded deck stays black
in both (it is the real product). No other accent colors, no gradients, no glows.

## Home page

- Hero (two columns, one column under 60rem): the name in orange, a one-line headline, one sentence,
  two pill buttons (Get Started = orange, GitHub = grey), and the `npx ippon-slides init` pill with a
  copy button. On the right, the editor window (window dots, `‹ 1 / 8 ›`) overlapping the deck.
- Feature cards: 8 cards, 4 / 2 / 1 columns, each with a Starlight icon in an orange-tinted square,
  a short title and one or two sentences. Keep the count a multiple of 4.
- Then a hairline and the license line. No closing CTA band.

## Copy

- Plain verbs, concrete facts (e.g. "same Wi-Fi", "subject to CORS"), no hype.
- English and Japanese say the same things; update both.
