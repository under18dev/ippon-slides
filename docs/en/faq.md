# FAQ

## What is ippon?

ippon is a command-line tool that turns Markdown into "one message per slide" decks. The npm
package is `ippon-slides` and the command is `ippon`. It outputs a single HTML file with all CSS
and JavaScript inlined, and a 16:9 PDF. It is MIT licensed and free to use.

## Do I need to install it?

No. With Node.js 18.17 or later, `npx ippon-slides init` runs it on the spot.
If you use it often, `npm install -g ippon-slides` gives you the `ippon` command.
See [Getting started](getting-started.md).

## How do I turn Markdown into slides?

Run `npx ippon-slides init` to create a sample `slide.md`, and separate slides with `---` lines.
`npx ippon-slides build slide.md` produces `slide.html`; open it in a browser and present.
The syntax is described in [Markdown syntax](syntax.md).

## Can I make Takahashi-method slides?

Yes. ippon is built around the Takahashi method (one short phrase per slide, shown large), and its
default look is large text on black. Text size follows the size of the screen, and a directive such
as `::size=2::` changes it per slide.

## Can I export to PDF?

Yes. `ippon build slide.md --pdf` produces a 16:9 PDF. It uses a local Chrome, Chromium or Edge,
so you need one of them. If it isn't found, point to the browser with `--browser-path` or the
`CHROME_PATH` environment variable.

## Can I export to PowerPoint (PPTX)?

No. The outputs are HTML and PDF. If you need a PPTX file, Marp or Slidev is a better fit
(see [Why ippon](why.md)).

## Can I present offline?

Yes. The HTML file contains all CSS and JavaScript, so it needs no server and no network.
Images keep their relative paths, so bring the image folder with the HTML, or embed the images
with `--inline`. The body font (Noto Sans JP) is a web font, so offline it falls back to a font
installed on the device.

## Can I use images and background photos?

Yes. A normal Markdown image `![alt](img/photo.png)` places an image, and clicking it zooms in.
[`::background::`](syntax.md#background-images-background) puts a photo behind the slide (or across its right half).

## Can I change the look?

Override CSS variables with `--css` to change the accent color, the heading font and the text size.
Per-slide background color and text size are set with the first-line directive (for example
`::center bg=blue size=1.3::`). See [Change the look](theming.md).

## Are there speaker notes and a timer?

Yes. Text below a `::note::` line becomes a speaker note. Press `p` to open the presenter view,
which shows the next slide, your notes and a timer. See [Presenter view and controls](presenter.md).

## Can I control the slides from my phone?

Yes. `ippon serve slide.md` prints a QR code; scan it with a phone on the same Wi-Fi.
You can change slides and control the timer from the phone, and read your speaker notes there.
See [Use your phone as a remote](serve.md).

## Which programming languages are highlighted?

TypeScript, JavaScript, shell, JSON, HCL (Terraform), YAML, Python, Go, Rust, HTML, CSS, diff and
console output. Lines starting with `!! ` are highlighted.
The full list is in [Code blocks](syntax.md#code-blocks).

## How do I publish and share a deck?

The HTML is a plain static file, so you can put it on GitHub Pages or any static host as is.
Add the public `url:` to the frontmatter and create the cover image with `ippon ogp slide.md`;
links to the deck then show the cover as their preview.

## Can I use it with an AI coding agent?

Yes. While `ippon serve` is running, `ippon current` prints the current slide number, its line
range in the Markdown and the text you selected in the deck, as JSON. `ippon skills init` adds a
skill file so Claude Code or Codex can handle "fix this slide".

## How is it different from Marp or Slidev?

ippon focuses on one-message slides: one look, zero dependencies, one HTML file. If you need
detailed layouts or PPTX export, Marp or Slidev is a better fit.
See [Why ippon](why.md) for details.
