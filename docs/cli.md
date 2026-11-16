# CLI リファレンス

```
ippon build <input.md> [options]   スライドをビルドする
ippon <input.md> [options]         build の省略形
ippon serve <input.md> [options]   ローカルで配信し、スマホをリモコンにする
ippon init [file]                  サンプルの Markdown を作る（既定: slide.md）
ippon current [input.md]           serve 中のデッキで表示中のスライドと選択中の文字列を JSON で出す
ippon skills init [dir]            current を使うエージェント用スキルを .claude/skills と .agents/skills に置く
ippon --help / --version
```

## `build`

| オプション | 意味 |
|---|---|
| `--html` | HTML を出力する（`--pdf` がなければ既定） |
| `--pdf` | PDF を出力する（Chrome / Chromium / Edge が必要） |
| `-o, --output <path>` | 出力先。ディレクトリ指定でその中に `<input>.html` / `.pdf` を作る。`--html --pdf` 両方指定時は拡張子だけ差し替える |
| `-w, --watch` | Markdown と `--css` の変更を監視して再ビルド |
| `--css <file>` | 追加の CSS（[見た目を変える](theming.md)） |
| `--inline` | 相対パスの画像を data URI で HTML に埋め込む。HTML 1 ファイルを渡すだけで画像も出る（読めない画像はパスのまま残して知らせる） |
| `--no-fetch` | [`::http::`](http.md) のレスポンスをビルド時に取得しない |
| `--browser-path <path>` | PDF に使うブラウザ（環境変数 `CHROME_PATH` でも可） |

### 出力先の決まり方

- `-o` の末尾が `/`、または既存ディレクトリ → その中に `<input>.html` / `.pdf`。
- `--html` と `--pdf` の両方 → `-o` の拡張子だけ差し替える。
- 省略時 → 入力と同じ場所に同名で出力。

```sh
ippon build slide.md --html
ippon build slide.md --pdf -o dist/
ippon build slide.md --html --pdf -o dist/talk
ippon build slide.md --html -w
ippon build slide.md --inline
```

## `serve`

| オプション | 意味 |
|---|---|
| `-p, --port <n>` | 待ち受けポート（省略時は空きポートを自動選択） |
| `--css <file>` | 追加の CSS |

詳しくは [スマホをリモコンにする](serve.md) を参照してください。

## `init`

```sh
ippon init            # slide.md を作る
ippon init talk.md    # 名前を指定
```

既存のファイルがある場合は上書きせずエラーにします。

## `current`

起動中の `ippon serve` に問い合わせ、ブラウザで表示中のスライドとデッキ上で選択中の文字列を
JSON で出します（中身は [`/__current-slide`](serve.md#コーディングエージェントと一緒に直す__current-slide) と同じ）。

```sh
ippon current            # 今いるディレクトリ配下の Markdown を serve しているもの（無ければ一番新しいもの）
ippon current talk.md    # talk.md を serve しているもの
```

`ippon serve` は起動中のポートを `~/.ippon/serve/` に登録し、終了時に消します。
`ippon current` はそこからサーバを探すので、ポートを知らなくても使えます。

## `skills init`

`ippon current` の使い方を教える [Agent Skills](https://agentskills.io/) の `SKILL.md` を置きます。

```sh
ippon skills init          # 今いるディレクトリに置く
ippon skills init ../talk  # 指定したディレクトリに置く
```

| 置き場所 | 読むエージェント |
|---|---|
| `.claude/skills/ippon-slides/SKILL.md` | Claude Code |
| `.agents/skills/ippon-slides/SKILL.md` | Codex など `.agents/skills` を読むエージェント |

既にある `SKILL.md` は上書きしません（手を入れた内容を消さないため）。`--force` で上書きします。

## 環境変数

- `CHROME_PATH` … PDF 出力に使うブラウザのパス（`--browser-path` と同じ）。
