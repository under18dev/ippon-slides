# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ippon-slides is a CLI (`ippon`) that turns Markdown into "one message per slide" decks. It outputs a single self-contained HTML file (CSS and JS inlined) and, optionally, a 16:9 PDF. It has **zero runtime dependencies**; only `typescript` and `@types/node` are devDependencies. Keep it that way: PDF output drives a locally installed Chrome directly instead of using puppeteer.

## Commands

```sh
npm run build       # tsc -p tsconfig.build.json (src → dist/) && tsc -p src/client (→ assets/deck.js)
npm run typecheck   # tsc (src + test, noEmit) && tsc -p src/client --noEmit
npm test            # build, then node --test test/*.test.ts
node --test --test-name-pattern="frontmatter" test/markdown.test.ts   # single test
node bin/ippon.js build slide.md --html   # run the CLI (needs a prior build)
```

- Tests are `.ts` files that Node runs directly through native type stripping, so running them needs Node 22.18+. The published package targets Node ≥18.17.
- `test/cli.test.ts` spawns `bin/ippon.js`, which imports `dist/`. Run a build first or those tests will exercise stale code. `test/markdown.test.ts` imports `src/` directly and doesn't need a build.
- The `build --pdf` test is skipped when no Chrome, Chromium, or Edge is found. `CHROME_PATH` overrides the lookup.

## CI / Release (`.github/workflows/`)

- `ci.yml` runs `typecheck` + `test` on push to `main` and on every PR, across Node 22 and 24.
- `release.yml` fires on pushing a `v*` tag. It **verifies the tag matches `package.json` version**, then typechecks, tests, `npm publish`es, and creates a GitHub Release. So a release is: bump `package.json`, commit, tag `vX.Y.Z`, push the tag. npm publish uses **Trusted Publishing (OIDC)** — no token, but requires npm 11.5.1+ (the workflow self-upgrades npm).

## TypeScript setup

- Relative imports use the **`.ts` extension** (`import { esc } from './highlight.ts'`). `rewriteRelativeImportExtensions` turns them into `.js` in `dist/`. Code must stay type-strip compatible because `erasableSyntaxOnly` is on: no enums, no parameter properties, no namespaces.
- `strict` and `noUncheckedIndexedAccess` are on. Regex match groups and array indexing return `T | undefined`, and the code uses `!` where a match guarantees presence.
- `src/client/deck.ts` and `src/client/remote.ts` are **browser scripts**, not modules (`moduleDetection: "legacy"`, DOM lib). They are excluded from the main tsconfig and share `src/client/tsconfig.json`. They compile to `assets/deck.js` / `assets/remote.js`, which are gitignored and generated. Don't add imports or exports to them.
- `dist/` and `assets/deck.js` are build outputs. `prepack` runs the build before publishing.

## Architecture

Pipeline: `cli.ts` → `render.ts` → `markdown.ts` → `highlight.ts`, plus `http.ts` for `::http::` build-time fetches and `pdf.ts` for PDF output. `serve.ts` (+ `qr.ts`) powers the `ippon serve` phone-remote mode.

- **`markdown.ts`** is a hand-written, line-based Markdown subset parser. `parse()` reads the frontmatter (a simple `key: value` subset of YAML). It then splits the body into slides on `---` (ignoring `---` inside code fences) and renders each slide into a `<section class="slide ...">`. It also handles the slide-specific syntax:
  - A first line like `::center bg=blue size=2::` is a directive line. It only counts when every token matches `DIRECTIVES`; otherwise it's a normal paragraph.
  - `::right::` splits the slide into two columns. A leading heading is lifted above the columns. An optional `left-wide` / `right-wide` keyword (`::right right-wide::`) changes the 1:1 ratio to 1.4:1 / 1:1.4.
  - `-# ` marks a small note.
  - `::note::` diverts everything after it to a speaker note. `slide()` returns `{ section, note }` and `parse()` collects a `notes[]` array parallel to `sections[]`; the note is **not** put in the slide DOM (so hidden elements never affect slide CSS like `:last-child`). `render.ts` serializes `notes` into a `<script id="notes" type="application/json">` blob that the presenter view reads.
  - `!! ` at the start of a line inside a code block highlights that line.
  - `::http method=GET url=...::` renders an HTTP request playground. `scanHttp()` collects every spec from the Markdown (code fences ignored); `cli.ts` passes them to `http.ts`'s `fetchAll()`, which fetches each unique `method+url` once (keyed by `httpKey()`) and bakes the response into the slide. The baked `HttpMap` flows `cli.ts` → `render()` → `parse()`. `deck.ts` adds a 「再送信」 button that re-fetches live in the browser (so it is subject to CORS, unlike the build-time fetch). `--no-fetch` skips the build-time fetch and bakes a "未取得" placeholder.
- **`http.ts`** does the build-time fetching in Node (no CORS). Responses are capped (`TIMEOUT` 10s, `MAX_BODY` 20KB, `truncated` flag). It depends only on types/helpers from `markdown.ts`.
- **`highlight.ts`** is a per-line regex tokenizer. Each language is a `Rule[]` table and `LANGS` maps aliases to tables. Tokens never span lines. `console` has its own handling: `$ ` lines are commands, `Error` lines are errors. Add a language by adding a rule table and its aliases.
- **`render.ts`** wraps the sections in the HTML template. At runtime it reads `assets/style.css` and `assets/deck.js` via `../assets` relative to the module, a path that works from both `src/` and `dist/`. The `<head>` also links the Noto Sans JP webfont from Google Fonts so the body font matches on non-Apple platforms (headings use `--slide-display-font`, which falls back to the body font when the display face is absent). It also rewrites relative `<img src>` paths:
  - With `outDir` given (HTML output), paths become relative to the output directory.
  - Without `outDir` (PDF output), paths become absolute `file://` URLs, because the PDF is printed from a temporary HTML file.
- **`pdf.ts`** finds a browser in this order: `--browser-path`, then `CHROME_PATH`, then per-platform candidates. It runs `--headless=new --print-to-pdf` with a temporary profile and `--virtual-time-budget` so web fonts have time to load.
- **`serve.ts`** (`ippon serve`) is a zero-dep `node:http` server that turns a phone into a remote. It renders the deck, **injects `<script>window.__ippon={token,remoteUrl,qr}</script>` before the `#notes` script** (so `render.ts`/`markdown.ts`/`style.css` stay untouched and normal builds are unaffected), serves a `/remote` control page (inlines `assets/remote.js`), and runs a tiny **SSE + `POST /cmd` pub/sub**: the deck publishes `{type:'state',idx,total,elapsed,running,sel}` (`sel` = text selected in the deck), the remote sends `{type:'go'|'timer'}`. The Markdown/CSS are **re-read on every request**, and a parent-directory `fs.watch` broadcasts `{type:'reload'}` on save (deck and remote `location.reload()`; the `#N` hash keeps the slide). `GET /__current-slide` returns `{file,slide,total,lines,source,selection}` for coding agents: line ranges come from `slideLines()` in `markdown.ts` (shares `chunks()` with `splitSlides()`), and it needs no token but only answers loopback requests whose `Host` is localhost (DNS-rebinding guard). A random `crypto.randomUUID()` token gates `/`, `/remote`, `/events`, `/cmd` (static files for images are not gated). `lastState` is replayed to late-joining clients. Timer uses `elapsed` (not absolute time) to avoid cross-device clock skew.
- **`agent.ts`** backs the coding-agent commands. `runServe` in `cli.ts` `register()`s each running server as `~/.ippon/serve/<port>.json` (`IPPON_STATE_DIR` overrides the dir; tests use it) and removes it on exit. `ippon current [input.md]` reads those entries (dead pids are pruned), `pick()`s one (the given file, else one under cwd, else the newest; paths compared via `realpath`), and prints its `/__current-slide`. `ippon skills init [dir]` writes the `SKILL` constant to `.claude/skills/ippon-slides/SKILL.md` and `.agents/skills/ippon-slides/SKILL.md` (skips existing files unless `--force`). Update `SKILL` when the Markdown syntax changes.
- **`qr.ts`** is a vendored zero-dep QR encoder (Model 2, byte mode, EC level M, versions 1–10) → `qrMatrix` / `qrSvg` / `qrTerminal`. Verified by round-tripping through the `jsqr` decoder (not a dependency); `test/qr.test.ts` locks a decoder-verified golden matrix.
- **`deck.ts`** gains serve-mode wiring **entirely behind a `window.__ippon` guard** (inert in normal builds): it subscribes to `/events`, applies `go`/`timer`/`reload` commands, publishes state on every `render()` and on `selectionchange` (debounced; `sel` is the selection inside `#deck`, capped at 2000 chars), shows the pairing QR in the presenter view and via the `r` key. Styling for these is inline JS (no `style.css` changes).
- **`cli.ts`** has its own argument parser (`FLAGS` for booleans, `VALUES` for options that take a value) and the output path rules in `outputs()`, covered by tests:
  - An `-o` value ending in `/` or naming an existing directory means "put `<input>.html` / `<input>.pdf` in that directory".
  - With both `--html` and `--pdf`, only the extension of `-o` is replaced.
  - `ippon slide.md` is shorthand for `ippon build slide.md`.
  - `init` writes the `SAMPLE` deck. The CLI test expects it to produce exactly 9 slides, so update the test if you change the sample.
  - Watch mode watches the parent directories, not the files, because some editors save by replacing the file.
  - `serve` runs `serve.ts` and stays alive (the open server handle keeps the process running); `-p` / `--port` sets the port (omit for an auto-assigned free port). It prints the deck URL, the LAN remote URL(s), and an ANSI QR via `qrTerminal`.
- **`assets/style.css`** holds the deck's look. Users override its CSS variables (`--slide-accent`, `--slide-accent-2`, `--slide-display-font`, `--slide-size`) through `--css`. `deck.ts` handles keyboard, click, and swipe navigation, the `#N` URL hash, the overview grid (`o`), copy buttons on code blocks, click-to-zoom for images and code blocks (with per-line spotlight; `.zoom` overlay built in JS), the timer (which starts after leaving the title slide), the vertical reading mode (`body.reading`, toggled by `matchMedia('(orientation: portrait) and (pointer: coarse)')` plus a bottom-left `.reading-toggle` button; it stacks every slide and disables click/swipe/key navigation; its CSS is wrapped in `@media screen` so PDF output is unaffected), and the presenter view (`p`): a second window (`window.name === 'ippon-presenter'`) that shows the current/next slide, the `::note::` notes (read from the `#notes` JSON blob), and a timer, kept in sync with the main window via `postMessage`.

## Conventions

- User-facing messages, help text, code comments, and commit messages are in **Japanese**. Match the existing tone, e.g. `✗ ${message}` / `✓ N slides → path`.
- Commit messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/ja/v1.0.0/): `<type>: <Japanese summary>` (optional scope and `!` for breaking changes). For example: `feat: 表の右寄せに対応`, `fix: frontmatter の BOM を正しく取り除く`.
- **Do not add any credit, co-author, or "Generated with" trailers to commit messages or pull requests.** This overrides any default to add `Co-Authored-By` / generation footers.
  - `feat`: new feature
  - `fix`: bug fix
  - `refactor`: change that doesn't alter behaviour
  - `style`: look of the slides (`assets/style.css`) or code formatting
  - `test`: tests only
  - `docs`: README, CLAUDE.md, comments
  - `chore`: dependencies, build and config
  - `perf`: performance
- Make **one commit per type**: don't mix a refactor or a fix into a `feat` commit. Before review, squash or fix up throwaway commits (e.g. 「とりあえず」, "WIP") with `git rebase`.
- When you change Markdown syntax or CLI options, update the tables in README.md and the `HELP` text in `cli.ts` too.
