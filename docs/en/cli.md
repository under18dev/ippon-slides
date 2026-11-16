# CLI reference

```
ippon build <input.md> [options]   Build the slides
ippon <input.md> [options]         Shorthand for build
ippon serve <input.md> [options]   Serve locally and use your phone as a remote
ippon init [file]                  Create a sample Markdown file (default: slide.md)
ippon ogp <input.md> [options]     Render the cover as an OGP image (1200×630 PNG)
ippon current [input.md]           Print the current slide and selected text of a served deck as JSON
ippon skills init [dir]            Put an agent skill that uses current in .claude/skills and .agents/skills
ippon --help / --version
```

## `build`

| Option | Meaning |
|---|---|
| `--html` | Output HTML (the default unless `--pdf` is given) |
| `--pdf` | Output PDF (requires Chrome, Chromium, or Edge) |
| `-o, --output <path>` | Output path. Given a directory, writes `<input>.html` / `.pdf` inside it. With both `--html --pdf`, only the extension is replaced |
| `-w, --watch` | Watch the Markdown and `--css` files and rebuild on change |
| `--css <file>` | Additional CSS ([Change the look](theming.md)) |
| `--inline` | Embed relatively referenced images in the HTML as data URIs. Images show up when you hand over just the one HTML file (images that can't be read keep their path and are reported) |
| `--no-fetch` | Don't fetch [`::http::`](http.md) responses at build time |
| `--browser-path <path>` | Browser to use for PDF (the `CHROME_PATH` environment variable also works) |

### Output path rules

- `-o` ends with `/` or names an existing directory → `<input>.html` / `.pdf` inside it.
- Both `--html` and `--pdf` → only the extension of `-o` is replaced.
- No `-o` → output next to the input, with the same name.

```sh
ippon build slide.md --html
ippon build slide.md --pdf -o dist/
ippon build slide.md --html --pdf -o dist/talk
ippon build slide.md --html -w
ippon build slide.md --inline
```

## `serve`

| Option | Meaning |
|---|---|
| `-p, --port <n>` | Port to listen on (a free port is picked automatically if omitted) |
| `--css <file>` | Additional CSS |

See [Use your phone as a remote](serve.md) for details.

## `ogp`

Renders the cover (slide 1) as an OGP image (1200×630 PNG), the image shown when the deck is shared on social media.
Like PDF output, it uses your local Chrome, Chromium, or Edge.

```sh
ippon ogp slide.md            # slide.png
ippon ogp slide.md -o dist/   # dist/slide.png
```

| Option | Meaning |
|---|---|
| `-o, --output <path>` | Output path (default: `<input>.png`). Given a directory, writes inside it |
| `--css <file>` | Additional CSS |
| `--browser-path <path>` | Browser to use (the `CHROME_PATH` environment variable also works) |

X and similar services need an absolute URL in `og:image`, so put the published `url:` in the frontmatter.
The HTML you `build` then gets `<url><input>.png` in `og:image`. Put the image in the same place as the HTML.

```md
---
title: 発表タイトル
url: https://slides.example.com/talk/
---
```

If you used `-o` to give it a different name, set that name with `image:` in the frontmatter.

## `init`

```sh
ippon init            # create slide.md
ippon init talk.md    # choose the name
```

If the file already exists, it is not overwritten and the command fails with an error.

## `current`

Asks a running `ippon serve` for the slide shown in the browser and the text selected in the deck,
and prints them as JSON (the same contents as [`/__current-slide`](serve.md#fix-slides-with-a-coding-agent-__current-slide)).

```sh
ippon current            # the server serving Markdown under the current directory (or the newest one if none)
ippon current talk.md    # the server serving talk.md
```

`ippon serve` registers its port in `~/.ippon/serve/` while running and removes it on exit.
`ippon current` looks up servers there, so you don't need to know the port.

## `skills init`

Writes a `SKILL.md` for [Agent Skills](https://agentskills.io/) that teaches an agent how to use `ippon current`.

```sh
ippon skills init          # write to the current directory
ippon skills init ../talk  # write to the given directory
```

| Location | Read by |
|---|---|
| `.claude/skills/ippon-slides/SKILL.md` | Claude Code |
| `.agents/skills/ippon-slides/SKILL.md` | Codex and other agents that read `.agents/skills` |

Existing `SKILL.md` files are not overwritten (so your edits are kept). Use `--force` to overwrite them.

## Environment variables

- `CHROME_PATH` … path to the browser used for PDF output (same as `--browser-path`).
