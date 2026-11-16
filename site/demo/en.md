---
title: ippon demo
lang: en
---

::title::

# One message per slide.

This deck was made with ippon

Press →, click or swipe to advance

---

::center::

Say

**one thing**

---

::center bg=blue size=1.3::

Background color?

One line

---

## Write it in Markdown

- `---` splits slides
- `::center::` on the first line sets the look
- `**bold**` turns into the accent color

::right center::

```md
::center::

Say

**one thing**
```

---

## Walk through code line by line

```ts
const app = new Hono()
!! app.get('/', (c) => c.text('Hello!'))
export default app
```

-# Click to zoom, then click a line to spotlight it

---

## Show changes as a diff

```diff
@@ -1,3 +1,3 @@
 import { serve } from './serve.ts'
-const port = 3000
+const port = Number(process.env.PORT ?? 3000)
```

---

## Hand out the deck with a QR code

- Put the URL on the last slide as a QR code
- People can open it the moment you finish

::right center::

::qr url=https://ippon.under18.dev/ caption::

---

::center::

**npx ippon-slides init**

-# and start writing
