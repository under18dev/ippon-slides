# Use your phone as a remote (`ippon serve`)

```sh
ippon serve slide.md
```

This starts a local server and shows a **QR code** in the terminal. Scan it with your phone's camera
to open the remote and control the slides from your hand.

## What you can do

- **Change slides** (◀ ▶ / first / last)
- **Reset the timer** and check the elapsed time
- **Read speaker notes** (what you wrote with `::note::`)

The main screen, the presenter view, and the phone stay in sync in real time.
When you save the Markdown (or the `--css` file), the open deck and presenter view update **without reloading the page**.
Only the slides that changed are swapped in, so the screen doesn't flicker, and the current slide and timer stay as they are (the remote reloads).

## How to use it

1. Connect your computer and your phone to the **same Wi-Fi**.
2. Run `ippon serve slide.md`.
3. Scan the QR code shown in the terminal with your phone's camera (or open the URL shown).
4. On your computer, open the URL printed after `この PC で開く:` ("open on this PC") in a browser and present.

The QR code also appears in these places:

- At the bottom right of the **presenter view** (`p` key).
- Press the **`r` key** on the main screen to show the QR code full screen (press `r` / `Esc` again to close it).

## Fix slides with a coding agent (`/__current-slide`)

While `ippon serve` is running, `ippon current` (backed by `/__current-slide`) returns the slide currently shown in the browser.
If you select text in the deck, that text is returned too.

```console
$ ippon current
{
  "file": "/Users/you/talk/slide.md",
  "slide": 3,
  "total": 12,
  "lines": { "start": 21, "end": 30 },
  "source": "## 3 枚目\n\n- 説明がわかりにくい行\n...",
  "selection": "説明がわかりにくい行"
}
```

| Key | Contents |
|---|---|
| `file` | Absolute path of the Markdown file |
| `slide` / `total` | Current slide number (1-based) and number of slides |
| `lines` | Line range of that slide in the Markdown (1-based, inclusive) |
| `source` | Markdown of that slide (including `::note::`) |
| `selection` | Text selected in the deck (`""` if none) |

Give this to a coding agent such as Claude Code, and you can select text in the browser and just ask
"make this shorter". The agent finds the matching part of the Markdown and fixes it.
When it saves, the deck updates in place.

To teach an agent how to do this, run the following in the directory with your slides.

```sh
ippon skills init
```

This creates `.claude/skills/ippon-slides/SKILL.md` (Claude Code) and `.agents/skills/ippon-slides/SKILL.md` (Codex and others).
From then on, when you ask "fix this", the agent reads the current slide and selected text with `ippon current` before
editing the Markdown. `ippon current` finds the running `ippon serve` by itself, so you don't need a fixed port
([CLI reference](cli.md#current)).

`/__current-slide` needs no token, but it **only answers requests from this computer addressed to `localhost` that carry an `x-ippon-key` header**
(your phone and other devices on the LAN cannot read it). The key changes on every start, and `ippon current` adds it for you.
To read it with `curl` directly, use the command `ippon serve` prints when it starts:

```sh
curl -s -H 'x-ippon-key: <key printed at startup>' http://127.0.0.1:3030/__current-slide
```

## How it works

- Communication is just a small pub/sub over **SSE (server → client) + `POST /cmd` (client → server)**.
  No WebSocket or external service is used (so there are still zero runtime dependencies).
- The main screen is the source of truth. The phone receives its state and displays it, and sends commands through the server.
- To avoid clock skew between devices, the timer exchanges elapsed time rather than absolute time.
- A phone that connects partway through gets the latest state (current slide and elapsed time) right away.

## Security

- The remote URL carries a **random token**. Without the correct token, the deck, remote, and streams
  (`/` `/remote` `/events` `/cmd`) are not accessible.
- `/__current-slide` needs no token, but in exchange it only accepts requests from this computer addressed to `localhost`
  (it also checks the `Host` header to block DNS rebinding from external sites).
  It also needs the key in the `x-ippon-key` header. The key is stored in `~/.ippon/serve/<port>.json`, which only you can read,
  so building someone else's Markdown with `::http::` cannot read the current slide and bake it into the HTML.
- Slide images are served only to browsers that opened the deck or the remote (they get a cookie then).
  Only images inside the Markdown's folder are served; symlinks pointing outside it are not followed.
- The server is exposed on your LAN and the traffic is not encrypted (HTTP). Don't run it on a network you don't want it exposed to.

## Options

| Option | Meaning |
|---|---|
| `-p, --port <n>` | Port to listen on (a free port is picked automatically if omitted) |
| `--css <file>` | Additional CSS |

Press `Ctrl+C` to stop.

## Troubleshooting

- **Check that both devices are on the same Wi-Fi** (it won't connect if your phone is on mobile data).
- If the Wi-Fi has **client isolation (AP isolation)** enabled, your phone cannot reach your computer.
  This is common on guest Wi-Fi. Try tethering or a different Wi-Fi network.
- Check that a firewall isn't blocking the port.
