# Presenter view and controls

## Keys

| Key | Action |
|---|---|
| `→` / `Space` / `PageDown` / click the right side of the screen | Next |
| `←` / `PageUp` / click the left side of the screen | Previous |
| `Home` / `End` | First / last |
| `f` | Full screen |
| `o` / `Esc` | Slide overview |
| `p` | Presenter view (separate window) |
| `r` | Show the remote QR code (only with `ippon serve`) |

- On a phone, you can also swipe left and right to change slides.
- Add `#12` to the URL to open the deck at slide 12.

## Reading mode (phone in portrait)

When you hold a phone upright, the deck switches to **reading mode**: all slides are stacked vertically and you scroll to read.
When you hand out the HTML for people to read on their phones, they don't have to flip through one slide at a time.

- Tap **「▶ スライド表示」** ("show as slides") at the bottom left to switch to the normal slide view (it starts from the slide you were reading).
  Tap **「☰ 縦に読む」** ("read vertically") to go back to reading mode.
- Rotating the device switches to match (landscape shows slides, portrait shows reading mode).
- In reading mode, tap and swipe navigation, the progress bar, and the timer are off.
- In a desktop browser (mouse input), the deck does not switch to reading mode even if the window is taller than it is wide.

## Zoom (spotlight)

**Click an image or code block** on a slide to show it enlarged, full screen.

- **Images**: click to zoom. Click again or press `Esc` to close.
- **Code**: click to zoom. While zoomed, **click a line to dim everything else and highlight just that
  line** (handy for pointing at what you are explaining). Click again to clear it; click the backdrop or
  press `Esc` to close.

Zoom is not included in PDF output (it is only an interaction during the talk).

## Timer

When you move on from the cover (slide 1), a timer starts at the bottom right. Going back to the cover resets it.

## Presenter view (`p`)

Press `p` to open the presenter view in a separate window. It shows you:

- The current slide and the next slide
- The **speaker notes** written with `::note::`
- The elapsed time and a clock

The main window (the one on the projector) stays in the normal view. Press `→` / `←` in either window
and both stay in sync. Press `p` / `Esc` to close it.

For how to write speaker notes, see [Markdown syntax › Speaker notes](syntax.md#speaker-notes-note).

## Use your phone as a remote

To read speaker notes and change slides from your phone, use [`ippon serve`](serve.md).
