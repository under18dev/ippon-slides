# Getting started

## Installation

You can use it without installing anything.

```sh
npx ippon-slides init          # create a sample slide.md
npx ippon-slides build slide.md --html
```

To install it globally:

```sh
npm install -g ippon-slides
ippon init
ippon build slide.md --html
```

- Node.js **18.17 or later** is required.
- PDF output requires Chrome, Chromium, or Edge.

## Basic workflow

1. Run `ippon init` to create a sample (or bring your own Markdown).
2. Separate slides with `---` and write one message per slide.
3. Run `ippon build slide.md --html` to create `slide.html`. Open it in a browser and present.

```sh
ippon build slide.md --html          # slide.html
ippon build slide.md --pdf           # slide.pdf (requires Chrome)
ippon build slide.md --html --pdf -o dist/talk
ippon build slide.md --html -w       # rebuild every time you save
ippon serve slide.md                 # serve the deck and use your phone as a remote
```

`ippon slide.md` is shorthand for `ippon build slide.md`.

## What to read next

- How to write slides → [Markdown syntax](syntax.md)
- Controls during a talk → [Presenter view and controls](presenter.md)
- Command details → [CLI reference](cli.md)
