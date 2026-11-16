# HTTP playground (`::http::`)

This feature shows the result of an HTTP request (status, response time, headers, and JSON body)
on a slide. It works well for introducing an API or giving a demo.

```md
::http method=GET url=https://api.github.com/repos/under18dev/ippon-slides::
```

- If you omit `method`, it is `GET`.
- You can also write the bare URL: `::http https://...::`.
- Write it on a line of its own (lines inside code fences are ignored).

## How it works: baked in at build time

The response is **fetched by Node at build time and baked into the HTML**. Unlike a browser `fetch`,
this is not subject to CORS, so any API works, and the result shows up offline and in PDFs as is.

- The network, rate limits, and CORS can't get in your way during the talk, so the demo is safe.
- Each `method + URL` pair is fetched only once.
- Fetches time out after 10 seconds, and bodies are capped at 20KB (anything beyond is cut off).

## Re-send button

A 「再送信」 (re-send) button appears next to the baked result. Clicking it sends the request again **live from the browser**.

- This path uses a regular `fetch`, so it **is subject to CORS**. If the server allows CORS, the result is replaced
  with the latest one.
- If it fails, the reason is shown and the **build-time snapshot is restored**.

## Skip fetching

To skip fetching at build time, add `--no-fetch`. A 「未取得」 (not fetched) placeholder
is baked in instead, and you fetch the response with the re-send button.

```sh
ippon build slide.md --html --no-fetch
```

## What is shown

- **Status**: colored by 2xx / 3xx / 4xx / 5xx.
- **Response time**: measured by Node at build time, and by the browser when re-sent.
- **Headers**: collapsed (`<details>`) with a count.
- **Body**: JSON is formatted and syntax-highlighted. Anything else is shown as plain text.
