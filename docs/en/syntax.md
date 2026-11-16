# Markdown syntax

ippon uses a hand-written parser for a subset of Markdown. Think of it as regular Markdown
with a few additions for slides.

## Frontmatter

You can put a simple frontmatter block of `key: value` lines at the top of the file.

```md
---
title: 発表タイトル
author: あなたの名前
description: 説明（任意）
lang: ja
url: https://slides.example.com/talk/
---
```

- `title` … the HTML `<title>` and `og:title`.
- `author` / `description` … go into `<meta>` tags (`description` also goes into `og:description`).
- `lang` … `<html lang>` (default `ja`).
- `url` … where you publish the slides. It becomes `og:url`, and the absolute URL of the cover image made with [`ippon ogp`](cli.md#ogp) (`<input>.png`) goes into `og:image`.
- `image` … replaces the `og:image` image (a path relative to `url`, or an absolute URL).

## Syntax rules

ippon adds only three kinds of syntax of its own. New syntax will follow the same rules.

| Kind | How to write it | Role | Example |
|---|---|---|---|
| **Slide directive** | `::...::` on the **first line** of a slide | Sets how the whole slide looks | `::center bg=blue size=2::` |
| **Block line** | `::name ...::` on a line of its own | Places something at that spot, or splits the slide | `::right::` `::note::` `::qr::` `::http::` `::background::` |
| **Line prefix** | A marker at the start of a paragraph or code line | Changes how that paragraph or line is treated | `-# note`, `!! ` in code |

Each line prefix applies to a different scope.

- `-# ` works **per paragraph**. Put it at the start of the first line of a paragraph and the whole paragraph (including the following lines up to a blank line) becomes a small note.
  If you put it on a line in the middle of a paragraph, it is shown as is, so write the note as a separate paragraph after a blank line.
- `!! ` works **per code line**. Inside a code block, it highlights only the line it is on.

### Directive and block line contents

- The contents are **keywords** (`center`, `caption`) and **`key=value`** pairs (`bg=blue`, `url=https://...`), separated by spaces.
- Values cannot contain spaces (write `%20` for a space in a path or URL).
- You can omit the key for the main value. `::qr https://...::`, `::http https://...::`, and `::background img/a.jpg::`
  are the same as writing `url=` / `url=` / `path=` respectively.
- Keys that take a number (`size=`, `brightness=`, `opacity=`) must be written as numbers.
- Unknown `key=value` pairs in a block line are ignored on their own (`::background a.jpg foo=1::` is a background of `a.jpg`).

### When you make a mistake

ippon **shows syntax it cannot read as plain text**. Slides don't disappear and the build doesn't stop.

- If the `::...::` on the first line contains even one unknown keyword, it is no longer a directive.
  If it can then be read as a block line, it becomes one (`::qr https://...::` or `::background img/a.jpg::` on the first line
  becomes a QR code or a background); otherwise it becomes a plain paragraph.
- A block line missing a required value, such as `url` for `::qr::`, `url` for `::http::`, or `path` for `::background::`, also becomes a plain paragraph.
- Values that are clearly malformed (`brightness=red`, a QR code URL that is too long) fail the build so you notice.

### Color backgrounds and image backgrounds

Backgrounds are written differently depending on their role.

- A **color** sets how the whole slide looks, so write it with `bg=` in the first-line directive (`::bg=blue::`, `::center bg=#222::`).
- An **image** has a placement (the whole slide or the right half), so write it with the `::background::` block line.

If you write both, the image is layered on top of the color. Lower the image's `opacity=` to let the color show through.

### Compatibility

From v1 on, these rules and the existing syntax stay compatible. Removing or changing syntax requires a major version bump.

## Slide breaks

A line containing only `---` separates slides. `---` inside a code fence does not.

```md
# 1 枚目

---

# 2 枚目
```

## Directives

Put `::...::` on the **first line** of a slide to set how that slide looks.
You can combine them, as in `::center bg=blue size=2::`.

| Directive | Meaning |
|---|---|
| `::center::` | Large centered text (for one-message slides) |
| `::title::` | Cover slide. The last paragraph is pushed to the bottom of the page |
| `::wide::` | Narrower left and right margins (for screenshots) |
| `::bg=blue::` | Background color. `blue` / `orange` / `purple` / `red` / `green` / `black` / `white`, or `#rrggbb` |
| `::size=1.5::` | Text size multiplier |

With `bg=white`, the slide automatically switches to a light theme (dark text).

## Two columns (`::right::`)

The right column starts at the `::right::` line. A leading heading is placed outside (above) the columns.

````md
## 見出し

- 左に説明
- もうひとつ

::right::

```ts
const app = new Hono()
```
````

Change the column widths with `::right left-wide::` (1.4 : 1) or `::right right-wide::` (1 : 1.4).

Columns are top-aligned by default. If one side holds something tall, such as a photo, the other side looks crammed at the top.
Write `::right center::` to center the columns vertically on that slide only.
You can combine it with a width, as in `::right right-wide center::` (in any order).

## Body text

- Headings: `#` / `##` / `###`
- Lists: `-` `*`, numbered `1.`. Indent to nest.
- **Bold** `**bold**` is shown in the accent color.
- `` `inline code` ``, *italic*, links `[text](url)`, images `![alt](src "caption")`.
- Blockquotes `> `, tables (`|`-separated; put `---` under the header row and use `:--` and similar to set alignment; write `|` inside a cell as `\|`).
- Arrows `→` are shown slightly dimmed.
- `-# note` … a small note.

## Code blocks

````md
```ts
const x = 1
!! const y = 2   // start a line with "!! " to highlight it
```
````

Supported highlighting: `hcl` / `tf` / `terraform`, `sh` / `bash` / `shell` / `zsh`, `json`,
`js` / `ts` / `jsx` / `tsx`, `yaml` / `yml`, `py` / `python`, `go` / `golang`, `rust` / `rs`,
`html` / `xml` / `svg`, `css`, `diff` / `patch`, `console`.

`console` colors lines starting with `$ ` as commands and lines containing `Error` as errors.

`diff` colors whole lines: lines starting with `+` as additions (green) and lines starting with `-` as deletions (red).
It also colors `@@` hunk headers and `---` / `+++` file headers. You can combine it with `!! `.

````md
```diff
@@ -1,2 +1,2 @@
-const port = 3000
!! +const port = Number(process.env.PORT ?? 3000)
```
````

Highlighting works one line at a time, so comments and strings that span multiple lines are not colored after the first line.

In the built HTML, a **Copy button** appears at the top right of each code block.

## Speaker notes (`::note::`)

Everything after `::note::` becomes the speaker note for that slide. It is not shown on the slide itself,
only in the [presenter view](presenter.md) and the phone remote.

```md
本番に出る内容

::note::

ここは手元のメモ。
```

## QR codes (`::qr::`)

Write `::qr url=https://...::` to embed a QR code for that URL in the slide as SVG.
It is generated at build time, so it needs no network and shows up in PDFs as is.

```md
::qr url=https://github.com/under18/ippon-slides::
::qr https://example.com caption::
```

- You can omit `url=` and write just the URL.
- Add `caption` to show the URL in small text under the QR code (hidden by default).
- The QR code always has a white background so it stays readable on any background color (`bg=`).
- You can also put it inside a `::right::` column.
- URLs can be up to 213 bytes. Longer URLs fail the build.

## Background images (`::background::`)

Write a `::background path=img/photo.jpg::` line to use that image as the slide background.
The image fills the screen and the overflow is cropped (`object-fit: cover`). Text sits on top of the image.

```md
::center::

::background path=img/stage.jpg brightness=0.4::

# 文字を乗せる
```

| Parameter | Meaning |
|---|---|
| `path=` | Image path (relative to the Markdown file, or a URL). You can omit `path=` and write just the path |
| `brightness=` | Brightness. `1` is unchanged, `0.5` is half as bright. Around `0.3` to `0.5` keeps text on top readable |
| `opacity=` | Opacity. `1` is unchanged, `0` is invisible. The slide's background color (`bg=`) shows through |

Write it after `::right::` to cover **only the right half of the screen** (from the right column to the right edge, full height).
This gives a layout with text on the left and a photo on the right. It follows `left-wide` / `right-wide` widths too.

```md
## 自己紹介

- 名前
- やっていること

::right::

::background path=img/me.jpg::
```

- Relative image paths are rewritten for the output location just like `<img>`, and embedded with `--inline`.
- Background images do not zoom when clicked.

## HTTP playground (`::http::`)

Use `::http method=GET url=https://...::` to show an HTTP response on a slide.
See [HTTP playground](http.md) for details.
