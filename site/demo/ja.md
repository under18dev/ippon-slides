---
title: ippon のデモ
lang: ja
---

::title::

# 1 枚に、1 メッセージ。

ippon で作ったスライドです

→ キー・クリック・スワイプで進む

---

::center::

言いたいことは

**1 つだけ**

---

::center bg=blue size=1.3::

背景色も

1 行で

---

## Markdown で書く

- `---` でスライドを区切る
- 1 行目の `::center::` で見せ方を決める
- `**太字**` はアクセントカラーになる

::right center::

```md
::center::

言いたいことは

**1 つだけ**
```

---

## コードは 1 行ずつ見せる

```ts
const app = new Hono()
!! app.get('/', (c) => c.text('Hello!'))
export default app
```

-# クリックで拡大、拡大中に行をクリックするとスポットライト

---

## 変更点は diff で

```diff
@@ -1,3 +1,3 @@
 import { serve } from './serve.ts'
-const port = 3000
+const port = Number(process.env.PORT ?? 3000)
```

---

## 資料は QR で配る

- URL を QR にして最後のスライドに
- 発表が終わったらすぐ見返してもらえる

::right center::

::qr url=https://ippon.under18.dev/ja/ caption::

---

::center::

**npx ippon-slides init**

-# からはじめよう
