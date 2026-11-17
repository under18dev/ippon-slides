# ippon-slides documentation

This is the full documentation for `ippon`, a CLI that turns Markdown into "one message per slide" decks.
For an overview and installation, see the [repository README](../../README.md).

The Japanese version is [here](../README.md).

The ideas behind the design, and how ippon differs from Marp, Slidev and reveal.js, are in [Why ippon](why.md).

## Contents

- [Getting started](getting-started.md) — installation, quick start, and the basic workflow
- [Markdown syntax](syntax.md) — slide breaks, directives, two columns, code, and tables
- [HTTP playground (`::http::`)](http.md) — show an HTTP response on a slide
- [Use your phone as a remote (`ippon serve`)](serve.md) — connect with a QR code to change slides and read notes
- [Presenter view and controls](presenter.md) — keys, timer, and speaker notes during a talk
- [Change the look](theming.md) — `--css` and CSS variables
- [CLI reference](cli.md) — all commands and options
- [Why ippon](why.md) — the ideas behind it, and how it differs from Marp, Slidev and reveal.js
- [FAQ](faq.md) — PDF, offline use, PPTX, phone control and more

## Features

- Outputs a **single HTML file** (all CSS and JS inlined). One file to hand out and share.
- **Zero runtime dependencies**. PDF output drives your local Chrome directly.
- 16:9 **PDF** output.
- Built-in HTTP playground, phone remote, and presenter view.
