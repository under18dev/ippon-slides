// スライドのナビゲーション。ippon が HTML に埋め込む。
//   → / Space / PageDown / クリック右側     次へ
//   ← / PageUp / クリック左側              前へ
//   Home / End                              最初 / 最後
//   f                                       フルスクリーン
//   o / Esc                                 一覧
//   p                                       発表者ビュー（別ウィンドウ）
//   スマホの縦持ち                          縦読みモード（全スライドを縦に並べる。左下のボタンで切り替え）
(() => {
  const slides = Array.from(document.querySelectorAll<HTMLElement>('#deck .slide'))
  if (!slides.length) return

  // ippon serve のときだけ注入される設定（スマホリモコン用）。無ければ従来どおり何もしない
  const serveCfg = (
    window as unknown as { __ippon?: { token: string; remoteUrl: string; qr: string } }
  ).__ippon

  const $ = (id: string) => document.getElementById(id)!
  const div = (className: string) => {
    const el = document.createElement('div')
    el.className = className
    return el
  }
  function fmt(ms: number): string {
    const total = Math.floor(ms / 1000)
    const m = Math.floor(total / 60)
    const s = total % 60
    return m + ':' + (s < 10 ? '0' : '') + s
  }

  // ---------- Spotlight / Zoom（画像・コードをクリックで拡大） ----------

  let zoomEl: HTMLElement | null = null
  function closeZoom(): void {
    if (zoomEl) {
      zoomEl.remove()
      zoomEl = null
    }
  }
  function openZoom(content: HTMLElement): void {
    closeZoom()
    const ov = div('zoom')
    ov.appendChild(content)
    ov.addEventListener('click', () => closeZoom()) // 背景クリックで閉じる
    document.body.appendChild(ov)
    zoomEl = ov
  }
  function openImageZoom(img: HTMLImageElement): void {
    const big = document.createElement('img')
    big.src = img.currentSrc || img.src
    big.alt = img.alt
    openZoom(big)
  }
  function openCodeZoom(pre: HTMLElement): void {
    const box = pre.cloneNode(true) as HTMLElement
    box.querySelector('.copy-btn')?.remove()
    box.classList.add('zoom-code')
    const code = box.querySelector('code')
    if (code) {
      // 行ごとに分けてクリックでスポットライトできるようにする
      // （ハイライトのトークンは行をまたがないので innerHTML を改行で割れる）
      const lines = code.innerHTML.split('\n')
      code.textContent = ''
      for (const ln of lines) {
        const line = div('zc-line')
        line.innerHTML = ln.length ? ln : '&#8203;'
        line.addEventListener('click', (e) => {
          e.stopPropagation()
          line.classList.toggle('spot')
          box.classList.toggle('dimmed', !!box.querySelector('.zc-line.spot'))
        })
        code.appendChild(line)
      }
    }
    // コード内のクリックは閉じない（行スポットライトを操作するため）
    box.addEventListener('click', (e) => e.stopPropagation())
    openZoom(box)
  }

  // 別ウィンドウで開いたときは発表者ビューとして動く（本番のナビは動かさない）
  if (window.name === 'ippon-presenter') {
    presenterMode()
    return
  }

  let idx = 0
  const progress = $('progress')
  const counter = $('counter')
  const timerEl = $('timer')

  const clamp = (n: number) => Math.max(0, Math.min(slides.length - 1, n))

  // ---------- タイマー（表紙から進んだら開始、表紙に戻ったらリセット） ----------

  let startedAt: number | null = null
  let ticking: number | undefined
  function syncTimer(): void {
    if (idx === 0) {
      startedAt = null
      clearInterval(ticking)
      ticking = undefined
      timerEl.textContent = ''
      return
    }
    const t0 = (startedAt ??= Date.now())
    ticking ??= window.setInterval(() => {
      timerEl.textContent = fmt(Date.now() - t0)
    }, 500)
    timerEl.textContent = fmt(Date.now() - t0)
  }

  // ---------- 描画 ----------

  function render(): void {
    slides.forEach((s, i) => s.classList.toggle('active', i === idx))
    slides[idx]!.scrollTop = 0
    counter.textContent = idx + 1 + ' / ' + slides.length
    progress.style.width = ((idx + 1) / slides.length) * 100 + '%'
    syncTimer()
    broadcast()
    netPublish()
  }
  function go(n: number): void {
    n = clamp(n)
    if (n === idx) return
    idx = n
    render()
    history.replaceState(null, '', '#' + (idx + 1))
  }
  window.addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10)
    if (n) go(n - 1)
  })

  // ---------- 発表者ビュー（別ウィンドウ）との同期 ----------

  let presenterWin: Window | null = null
  function openPresenter(): void {
    if (presenterWin && !presenterWin.closed) {
      presenterWin.focus()
      return
    }
    presenterWin = window.open(location.href, 'ippon-presenter', 'width=1024,height=700')
  }
  function broadcast(): void {
    if (presenterWin && !presenterWin.closed)
      presenterWin.postMessage({ ippon: 'state', idx, total: slides.length, startedAt }, '*')
  }
  window.addEventListener('message', (e) => {
    const m = e.data as { ippon?: string; n?: number } | null
    if (!m || typeof m !== 'object') return
    if (m.ippon === 'hello') broadcast()
    else if (m.ippon === 'go' && typeof m.n === 'number') go(m.n)
  })

  // ---------- serve（スマホリモコン：SSE で受信、/cmd へ state 送信） ----------

  function netPublish(): void {
    if (!serveCfg) return
    const running = startedAt != null
    fetch('/cmd?t=' + encodeURIComponent(serveCfg.token), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'state',
        idx,
        total: slides.length,
        elapsed: running ? Date.now() - startedAt! : 0,
        running,
      }),
    }).catch(() => {})
  }
  function resetTimer(): void {
    startedAt = idx === 0 ? null : Date.now()
    syncTimer()
    netPublish()
  }
  function initServe(): void {
    if (!serveCfg) return
    const es = new EventSource('/events?t=' + encodeURIComponent(serveCfg.token))
    es.onmessage = (e) => {
      let m: { type?: string; n?: number; action?: string }
      try {
        m = JSON.parse(e.data)
      } catch {
        return
      }
      if (m.type === 'go' && typeof m.n === 'number') go(m.n)
      else if (m.type === 'timer' && m.action === 'reset') resetTimer()
    }
  }

  // QR を全画面で出す（r キー）。スマホのカメラで読めばリモコンになる
  let qrOverlay: HTMLElement | null = null
  function toggleQr(): void {
    if (!serveCfg) return
    if (qrOverlay) {
      qrOverlay.remove()
      qrOverlay = null
      return
    }
    const ov = div('')
    ov.style.cssText =
      'position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(0,0,0,.88);cursor:pointer'
    const box = div('')
    box.style.cssText = 'background:#fff;padding:16px;border-radius:12px;width:min(60vmin,360px)'
    box.innerHTML = serveCfg.qr
    const svg = box.querySelector('svg')
    if (svg) svg.setAttribute('style', 'width:100%;height:auto;display:block')
    const url = div('')
    url.style.cssText =
      'color:#fff;font-family:system-ui,sans-serif;font-size:1rem;word-break:break-all;max-width:80vw;text-align:center'
    url.textContent = serveCfg.remoteUrl
    const hint = div('')
    hint.style.cssText = 'color:#aaa;font-family:system-ui,sans-serif;font-size:.85rem'
    hint.textContent = 'スマホのカメラで読み取るとリモコンになります（同じ Wi-Fi に接続）'
    ov.appendChild(box)
    ov.appendChild(url)
    ov.appendChild(hint)
    ov.addEventListener('click', () => toggleQr())
    document.body.appendChild(ov)
    qrOverlay = ov
  }

  // ---------- 一覧 ----------

  interface Thumb {
    item: HTMLElement
    frame: HTMLElement
    scale: HTMLElement
  }

  const overview = $('overview')
  let ovItems: Thumb[] | null = null
  let ovOpen = false
  const THUMB = 240

  function buildOverview(): Thumb[] {
    return slides.map((s, i) => {
      const item = div('ov-item')
      const frame = div('ov-frame')
      const scale = div('ov-scale')
      const clone = s.cloneNode(true) as HTMLElement
      clone.classList.remove('active')
      scale.appendChild(clone)
      frame.appendChild(scale)
      const num = div('ov-num')
      num.textContent = String(i + 1)
      item.appendChild(frame)
      item.appendChild(num)
      item.addEventListener('click', () => {
        idx = i
        closeOverview()
        render()
        history.replaceState(null, '', '#' + (idx + 1))
      })
      overview.appendChild(item)
      return { item, frame, scale }
    })
  }
  function layoutOverview(items: Thumb[]): void {
    const w = window.innerWidth
    const h = window.innerHeight
    const k = THUMB / w
    for (const t of items) {
      t.frame.style.width = THUMB + 'px'
      t.frame.style.height = h * k + 'px'
      t.scale.style.width = w + 'px'
      t.scale.style.height = h + 'px'
      t.scale.style.transform = 'scale(' + k + ')'
    }
  }
  function openOverview(): void {
    const items = (ovItems ??= buildOverview())
    layoutOverview(items)
    items.forEach((t, i) => t.item.classList.toggle('current', i === idx))
    ovOpen = true
    document.body.classList.add('overview')
    items[idx]!.item.scrollIntoView({ block: 'center' })
  }
  function closeOverview(): void {
    ovOpen = false
    document.body.classList.remove('overview')
  }
  window.addEventListener('resize', () => {
    if (ovOpen && ovItems) layoutOverview(ovItems)
  })

  // ---------- 縦読みモード（スマホの縦持ちでは全スライドを縦に並べてスクロールで読む） ----------

  const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)')
  let readingOff = false // 縦持ちのまま「スライド表示」に切り替えた
  const readBtn = document.createElement('button')
  readBtn.type = 'button'
  readBtn.className = 'reading-toggle'
  document.body.appendChild(readBtn)
  const reading = () => document.body.classList.contains('reading')

  // 縦読みで画面の上の方に見えているスライド
  function visibleSlide(): number {
    const i = slides.findIndex((s) => s.getBoundingClientRect().bottom > window.innerHeight * 0.3)
    return i < 0 ? slides.length - 1 : i
  }
  function syncReading(): void {
    const on = portrait.matches && !readingOff
    if (on && !reading()) {
      closeOverview()
      document.body.classList.add('reading')
      slides[idx]!.scrollIntoView()
    } else if (!on && reading()) {
      // 縦読みで読んでいたスライドからプレゼン表示を始める
      const n = visibleSlide()
      document.body.classList.remove('reading')
      if (n !== idx) go(n)
    }
    readBtn.hidden = !portrait.matches
    readBtn.textContent = on ? '▶ スライド表示' : '☰ 縦に読む'
  }
  readBtn.addEventListener('click', () => {
    readingOff = !readingOff
    syncReading()
  })
  // 回転したら向きに合わせ直す
  portrait.addEventListener('change', () => {
    readingOff = false
    syncReading()
  })

  // ---------- 入力 ----------

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (zoomEl) {
      if (e.key === 'Escape') closeZoom()
      return
    }
    if (reading()) return
    if (ovOpen) {
      if (e.key === 'Escape' || e.key === 'o') closeOverview()
      return
    }
    if (qrOverlay) {
      if (e.key === 'Escape' || e.key === 'r') toggleQr()
      return
    }
    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault()
        go(idx + 1)
        break
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault()
        go(idx - 1)
        break
      case 'Home':
        go(0)
        break
      case 'End':
        go(slides.length - 1)
        break
      case 'f':
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen()
        break
      case 'o':
        openOverview()
        break
      case 'p':
        openPresenter()
        break
      case 'r':
        toggleQr()
        break
      case 'Escape':
        if (!document.fullscreenElement) openOverview()
        break
    }
  })

  // 画面の右 3 割で次へ、左 3 割で前へ（リンクと文字選択は邪魔しない）
  const deck = $('deck')
  deck.addEventListener('click', (e) => {
    if (reading()) return
    if (e.target instanceof Element && e.target.closest('a, button')) return
    if (String(window.getSelection() || '')) return
    const x = e.clientX / window.innerWidth
    if (x > 0.7) go(idx + 1)
    else if (x < 0.3) go(idx - 1)
  })

  // 横スワイプ
  let touch: { x: number; y: number } | null = null
  deck.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0]
      touch = e.touches.length === 1 && t ? { x: t.clientX, y: t.clientY } : null
    },
    { passive: true }
  )
  deck.addEventListener(
    'touchend',
    (e) => {
      const t = e.changedTouches[0]
      if (!touch || !t || reading()) return
      const dx = t.clientX - touch.x
      const dy = t.clientY - touch.y
      touch = null
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? idx + 1 : idx - 1)
    },
    { passive: true }
  )

  // コードブロックの右上にコピーボタンを付ける
  slides.forEach((s) => {
    s.querySelectorAll('pre').forEach((pre) => {
      const code = pre.querySelector<HTMLElement>('code') || pre
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'copy-btn'
      btn.textContent = 'Copy'
      btn.addEventListener('click', () => {
        const text = code.innerText
        const done = () => {
          btn.textContent = 'Copied!'
          btn.classList.add('copied')
          window.setTimeout(() => {
            btn.textContent = 'Copy'
            btn.classList.remove('copied')
          }, 1200)
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done)
        } else {
          const ta = document.createElement('textarea')
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          try {
            document.execCommand('copy')
          } catch {}
          document.body.removeChild(ta)
          done()
        }
      })
      pre.appendChild(btn)

      // クリックでコードを拡大（文字選択中とコピーボタンは邪魔しない）
      pre.addEventListener('click', (e) => {
        if (e.target instanceof Element && e.target.closest('.copy-btn')) return
        if (String(window.getSelection() || '')) return
        e.stopPropagation()
        openCodeZoom(pre)
      })
    })

    // 画像はクリックで拡大
    s.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      img.addEventListener('click', (e) => {
        e.stopPropagation()
        openImageZoom(img)
      })
    })
  })

  // ::http:: の「再送信」ボタン：ブラウザからライブで叩く（CORS が通る相手のみ）。
  // 失敗したらビルド時のスナップショットに戻す。
  function escText(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function hlJson(src: string): string {
    const re = /"(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?/g
    let out = ''
    let last = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
      out += escText(src.slice(last, m.index))
      const tok = m[0]
      last = m.index + tok.length
      // 文字列で直後が : ならキー（hl-t）、それ以外の文字列は hl-s、数値と true/false/null は hl-n
      const cls = tok[0] === '"' ? (/^\s*:/.test(src.slice(last)) ? 'hl-t' : 'hl-s') : 'hl-n'
      out += '<span class="' + cls + '">' + escText(tok) + '</span>'
    }
    return out + escText(src.slice(last))
  }
  function httpStatusClass(status: number): string {
    return 's-' + (status < 200 ? 1 : status < 300 ? 2 : status < 400 ? 3 : status < 500 ? 4 : 5) + 'xx'
  }
  function httpResultHtml(r: Response, text: string, ms: number): string {
    let count = 0
    let rows = ''
    r.headers.forEach((v, k) => {
      count++
      rows += '<tr><td class="http-hk">' + escText(k) + '</td><td class="http-hv">' + escText(v) + '</td></tr>'
    })
    const ct = r.headers.get('content-type') || ''
    let body: string
    if (/\bjson\b/i.test(ct) || /^\s*[[{]/.test(text)) {
      try {
        body = '<pre data-lang="json"><code>' + hlJson(JSON.stringify(JSON.parse(text), null, 2)) + '</code></pre>'
      } catch {
        body = '<pre><code>' + escText(text) + '</code></pre>'
      }
    } else {
      body = '<pre><code>' + escText(text) + '</code></pre>'
    }
    return (
      '<div class="http-status">' +
      '<span class="http-code ' + httpStatusClass(r.status) + '">' + r.status + '</span>' +
      '<span class="http-statustext">' + escText(r.statusText) + '</span>' +
      '<span class="http-time">' + ms + ' ms</span></div>' +
      '<details class="http-headers"><summary>ヘッダー（' + count + '）</summary><table>' + rows + '</table></details>' +
      body
    )
  }
  slides.forEach((s) => {
    s.querySelectorAll<HTMLElement>('.http').forEach((box) => {
      const btn = box.querySelector<HTMLButtonElement>('.http-send')
      const resEl = box.querySelector<HTMLElement>('.http-res')
      if (!btn || !resEl) return
      const baked = resEl.innerHTML // ビルド時スナップショット
      const method = box.dataset.method || 'GET'
      const url = box.dataset.url || ''
      btn.addEventListener('click', async () => {
        if (!url) return
        const label = btn.textContent
        btn.disabled = true
        btn.textContent = '送信中…'
        const t0 = performance.now()
        try {
          const r = await fetch(url, { method })
          const text = await r.text()
          resEl.dataset.state = 'ok'
          resEl.innerHTML = httpResultHtml(r, text, Math.round(performance.now() - t0))
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          resEl.dataset.state = 'error'
          resEl.innerHTML =
            '<div class="http-status"><span class="http-errmsg">✗ ' + escText(msg) + '</span></div>' +
            '<p class="http-msg">ブラウザからは CORS で取得できないことがあります。ビルド時のスナップショットを表示します。</p>' +
            baked
        } finally {
          btn.disabled = false
          btn.textContent = label
        }
      })
    })
  })

  const start = parseInt(location.hash.slice(1), 10)
  if (start) idx = clamp(start - 1)
  render()
  syncReading()

  if (serveCfg) {
    const hint = $('hint')
    if (hint) hint.textContent += ' ・ r リモコン'
    initServe()
  }

  // ---------- 発表者ビュー本体（別ウィンドウで動く） ----------

  function presenterMode(): void {
    document.body.classList.add('presenter')
    const root = $('presenter')

    const left = div('pv-left')
    const right = div('pv-right')
    root.appendChild(left)
    root.appendChild(right)

    const makeSlot = (labelText: string) => {
      const slot = div('pv-slot')
      const label = div('pv-label')
      label.textContent = labelText
      const frame = div('pv-frame')
      const scale = div('pv-scale')
      frame.appendChild(scale)
      slot.appendChild(label)
      slot.appendChild(frame)
      left.appendChild(slot)
      return { label, frame, scale }
    }
    const cur = makeSlot('現在')
    const nxt = makeSlot('次へ')

    const clock = div('pv-clock')
    const elapsedEl = div('pv-elapsed')
    const wallEl = div('pv-wall')
    clock.appendChild(elapsedEl)
    clock.appendChild(wallEl)

    const controls = div('pv-controls')
    const prevBtn = document.createElement('button')
    prevBtn.textContent = '◀'
    const nextBtn = document.createElement('button')
    nextBtn.textContent = '▶'
    controls.appendChild(prevBtn)
    controls.appendChild(nextBtn)

    const notesEl = div('pv-notes')
    right.appendChild(clock)
    right.appendChild(controls)
    right.appendChild(notesEl)

    // serve のときはリモコン用 QR を手元に出す
    if (serveCfg) {
      const qr = div('')
      qr.style.cssText = 'display:flex;align-items:center;gap:12px;margin-top:4px'
      const img = div('')
      img.style.cssText = 'background:#fff;padding:8px;border-radius:8px;width:120px;flex:none'
      img.innerHTML = serveCfg.qr
      const s = img.querySelector('svg')
      if (s) s.setAttribute('style', 'width:100%;height:auto;display:block')
      const cap = div('')
      cap.style.cssText = 'font-size:.8rem;color:#9a9aa0;word-break:break-all'
      cap.textContent = 'スマホで読み取るとリモコン: ' + serveCfg.remoteUrl
      qr.appendChild(img)
      qr.appendChild(cap)
      right.appendChild(qr)
    }

    let curIdx = 0
    let total = slides.length
    let startedAt: number | null = null

    // 発表者ノートは <script id="notes"> の JSON から読む（スライド本体には無い）
    let notesData: string[] = []
    try {
      const el = document.getElementById('notes')
      if (el && el.textContent) notesData = JSON.parse(el.textContent)
    } catch {}

    function fitPreview(frame: HTMLElement, scale: HTMLElement): void {
      const w = window.innerWidth
      const h = window.innerHeight
      const fw = frame.clientWidth
      const k = fw / w
      frame.style.height = fw * (h / w) + 'px'
      scale.style.width = w + 'px'
      scale.style.height = h + 'px'
      scale.style.transform = 'scale(' + k + ')'
    }
    function setPreview(frame: HTMLElement, scale: HTMLElement, i: number): void {
      scale.textContent = ''
      const s = slides[i]
      if (s) scale.appendChild(s.cloneNode(true))
      fitPreview(frame, scale)
    }
    function draw(): void {
      cur.label.textContent = '現在  ' + (curIdx + 1) + ' / ' + total
      setPreview(cur.frame, cur.scale, curIdx)
      const hasNext = curIdx + 1 < total
      nxt.label.textContent = hasNext ? '次へ  ' + (curIdx + 2) + ' / ' + total : 'おわり'
      setPreview(nxt.frame, nxt.scale, hasNext ? curIdx + 1 : -1)
      const note = notesData[curIdx]
      notesEl.innerHTML = note ? note : '<p class="pv-empty">（ノートなし）</p>'
    }
    function tick(): void {
      elapsedEl.textContent = startedAt == null ? '0:00' : fmt(Date.now() - startedAt)
      wallEl.textContent = new Date().toLocaleTimeString()
    }

    const send = (n: number) => {
      if (window.opener) window.opener.postMessage({ ippon: 'go', n }, '*')
    }
    prevBtn.addEventListener('click', () => send(curIdx - 1))
    nextBtn.addEventListener('click', () => send(curIdx + 1))

    window.addEventListener('message', (e) => {
      const m = e.data as { ippon?: string; idx?: number; total?: number; startedAt?: number | null } | null
      if (!m || m.ippon !== 'state') return
      if (typeof m.idx === 'number') curIdx = m.idx
      if (typeof m.total === 'number') total = m.total
      startedAt = m.startedAt ?? null
      draw()
      tick()
    })
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          e.preventDefault()
          send(curIdx + 1)
          break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault()
          send(curIdx - 1)
          break
        case 'Home':
          send(0)
          break
        case 'End':
          send(total - 1)
          break
        case 'p':
        case 'Escape':
          window.close()
          break
      }
    })
    window.addEventListener('resize', () => {
      fitPreview(cur.frame, cur.scale)
      fitPreview(nxt.frame, nxt.scale)
    })
    window.setInterval(tick, 500)

    // 本番ウィンドウに現在の状態を要求する
    if (window.opener) window.opener.postMessage({ ippon: 'hello' }, '*')
    draw()
    tick()
  }
})()
