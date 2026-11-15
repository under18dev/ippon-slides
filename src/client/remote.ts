// スマホのリモコン画面。ippon serve が /remote で配信する HTML から読み込まれる。
// window.__ipponRemote（token / total / notes）を読み、SSE で state を受け、
// fetch POST でページ送り・タイマー操作を送る。
(() => {
  const cfg = (window as unknown as { __ipponRemote?: { token: string; total: number; notes: string[] } })
    .__ipponRemote
  if (!cfg) return
  const { token, total, notes } = cfg

  const $ = (id: string) => document.getElementById(id)!
  const posEl = $('pos')
  const clockEl = $('clock')
  const noteEl = $('note')
  const connEl = $('conn')

  function fmt(ms: number): string {
    const t = Math.floor(ms / 1000)
    const m = Math.floor(t / 60)
    const s = t % 60
    return m + ':' + (s < 10 ? '0' : '') + s
  }

  let idx = 0
  // タイマーは端末間の時計ずれを避けるため「受信時の elapsed」を基準にローカルで進める
  let baseElapsed = 0
  let baseAt = Date.now()
  let running = false

  const send = (type: string, extra: Record<string, unknown> = {}) => {
    fetch('/cmd?t=' + encodeURIComponent(token), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, ...extra }),
    }).catch(() => {})
  }

  const go = (n: number) => send('go', { n })
  ;($('prev') as HTMLButtonElement).addEventListener('click', () => go(idx - 1))
  ;($('next') as HTMLButtonElement).addEventListener('click', () => go(idx + 1))
  ;($('first') as HTMLButtonElement).addEventListener('click', () => go(0))
  ;($('last') as HTMLButtonElement).addEventListener('click', () => go(total - 1))
  ;($('reset') as HTMLButtonElement).addEventListener('click', () => send('timer', { action: 'reset' }))

  function draw(): void {
    posEl.textContent = idx + 1 + ' / ' + total
    const note = notes[idx]
    noteEl.innerHTML = note ? note : '<p class="empty">（ノートなし）</p>'
  }
  function tick(): void {
    const elapsed = running ? baseElapsed + (Date.now() - baseAt) : baseElapsed
    clockEl.textContent = fmt(elapsed)
  }

  function connect(): void {
    const es = new EventSource('/events?t=' + encodeURIComponent(token))
    es.onopen = () => {
      connEl.textContent = '接続済み'
      connEl.classList.remove('off')
    }
    es.onerror = () => {
      connEl.textContent = '再接続中…'
      connEl.classList.add('off')
    }
    es.onmessage = (e) => {
      let m: { type?: string; idx?: number; elapsed?: number; running?: boolean }
      try {
        m = JSON.parse(e.data)
      } catch {
        return
      }
      if (m.type === 'reload') return location.reload() // Markdown が書き換わった（ノートを読み直す）
      if (m.type !== 'state') return
      if (typeof m.idx === 'number') idx = m.idx
      running = !!m.running
      baseElapsed = typeof m.elapsed === 'number' ? m.elapsed : 0
      baseAt = Date.now()
      draw()
      tick()
    }
  }

  connect()
  window.setInterval(tick, 500)
  draw()
  tick()
})()
