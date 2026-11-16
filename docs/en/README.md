# ippon-slides documentation

日本語版は [こちら](../README.md).

This is the full documentation for `ippon`, a CLI that turns Markdown into "one message per slide" decks.
For an overview and installation, see the [repository README](../../README.md).

The ideas behind the design are described in the "思想" (philosophy) section of the [repository README](../../README.md).

## Contents

- [Getting started](getting-started.md) — installation, quick start, and the basic workflow
- [Markdown syntax](syntax.md) — slide breaks, directives, two columns, code, and tables
- [HTTP playground (`::http::`)](http.md) — show an HTTP response on a slide
- [Use your phone as a remote (`ippon serve`)](serve.md) — connect with a QR code to change slides and read notes
- [Presenter view and controls](presenter.md) — keys, timer, and speaker notes during a talk
- [Change the look](theming.md) — `--css` and CSS variables
- [CLI reference](cli.md) — all commands and options

## Features

- Outputs a **single HTML file** (all CSS and JS inlined). One file to hand out and share.
- **Zero runtime dependencies**. PDF output drives your local Chrome directly.
- 16:9 **PDF** output.
- Built-in HTTP playground, phone remote, and presenter view.
