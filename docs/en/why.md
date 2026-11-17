# Why ippon (compared with Marp, Slidev and reveal.js)

ippon is a CLI for making "one message per slide" decks with as little effort as possible.
There are other tools that turn Markdown into slides. This page explains what ippon chose,
what it left out, and when another tool is the better fit.

## One message per slide (the Takahashi method)

ippon is built around the [Takahashi method](https://en.wikipedia.org/wiki/Takahashi_method):
each slide shows one short phrase, as large as the screen allows. A slide is not a document to
read but a cue that supports what you are saying. When you feel like adding more bullets, that
is the cue to split the slide.

That is why ippon has almost no theme or layout system. It defaults to one look, large text on
black, so you can start writing and present right away.

## How it differs from other tools

| | ippon | Marp | Slidev | reveal.js |
|---|---|---|---|---|
| Authoring | Markdown (with a little extra syntax) | Markdown | Markdown and Vue components | HTML (Markdown through a plugin) |
| Output | One HTML file, PDF, OGP image | HTML, PDF, PPTX, images | Web app, PDF, PPTX, PNG | HTML (PDF through the browser's print) |
| Look | One look, tuned with CSS variables | Themes written in CSS | Many themes and layouts | Many themes and plugins |
| Requirements | Node.js only (zero dependencies). PDF uses your local Chrome | Node.js. PDF and others use a local browser | A Node.js project. Export uses Playwright | A browser (Node.js for development) |
| Presenting | Presenter view, phone remote, timer | Presenter view | Presenter mode, drawing, recording | Speaker view |

This is a rough comparison from ippon's point of view. Check each tool's official docs
([Marp](https://marp.app/), [Slidev](https://sli.dev/), [reveal.js](https://revealjs.com/)) for its current features.

## When ippon fits

- You want to show one point at a time, in large type (lightning talks, meetups, internal talks).
- You want to hand out the deck as one HTML file that opens offline, years from now.
- You want to run it right away with `npx`, without a project or extra dependencies.
- You want to show code or API responses ([code highlighting](syntax.md#code-blocks), [`::http::`](http.md)).
- You want to present while controlling the deck from your phone ([`ippon serve`](serve.md)).

## When another tool fits better

- You want detailed layouts, diagrams or animations → Slidev or reveal.js.
- You have to deliver a PowerPoint (PPTX) file → Marp or Slidev.
- You want dense slides meant to be read → Marp, or apps such as Google Slides or PowerPoint.

## What ippon leaves out

- More themes and layouts. The look is adjusted only through [CSS variables](theming.md).
- Runtime dependencies. PDF export uses your local Chrome instead of bundling a browser.
- External services. The presenter view and the phone remote use only standard browser and Node.js features.

> When in doubt, remove — from your slides, and from this tool.
