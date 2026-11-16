# Change the look

Pass additional CSS with `--css` to override the CSS variables.

```sh
ippon build slide.md --html --css theme.css
```

```css
/* theme.css */
:root {
  --slide-accent: #ff6a00;   /* progress bar, overview outline */
  --slide-accent-2: #ff6a00; /* bold, emphasis */
  --slide-display-font: 'Hiragino Sans', sans-serif;
  --slide-size: 1;           /* text size multiplier */
}
```

## Main CSS variables

| Variable | Use |
|---|---|
| `--slide-accent` | Accent for the progress bar, the selection outline in the overview, and so on |
| `--slide-accent-2` | Accent for bold and emphasis |
| `--slide-display-font` | Heading font |
| `--slide-size` | Text size multiplier |

- Headings use `--slide-display-font` (Toppan Bunkyu Midashi Gothic by default; it falls back to
  the body font when that font isn't installed). Body text uses Noto Sans JP (loaded as a web font).
- You can also set the background color and text size per slide with the [`::bg=...::` / `::size=...::` directives](syntax.md#directives).

`--css` also works with `ippon serve`.
