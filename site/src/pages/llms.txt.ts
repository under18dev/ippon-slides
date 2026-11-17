// https://llmstxt.org/ の形式で、サイトの要約とドキュメントの一覧を返す
import type { APIRoute } from 'astro'
import { COPY } from '../landing'
import { CREDIT, SITE, docsOf } from '../llms'

export const GET: APIRoute = async () => {
  const section = async (prefix: '' | 'ja/') =>
    (await docsOf(prefix)).map((e) => `- [${e.data.title}](${SITE}/${e.id}/): ${e.data.description ?? ''}`.trimEnd()).join('\n')

  const body = `# ippon

> ${COPY.en.description}

ippon (npm package \`ippon-slides\`, command \`ippon\`) is a zero-dependency Node.js CLI for Takahashi-method, one-message-per-slide presentations. Write slides in Markdown separated by \`---\`, then run \`npx ippon-slides build slide.md\` to get a single self-contained HTML file, or add \`--pdf\` for a 16:9 PDF (uses a local Chrome). MIT licensed. Source: https://github.com/under18dev/ippon-slides

${CREDIT}

- Try it: \`npx ippon-slides init\` creates a sample \`slide.md\`.
- The full documentation as one Markdown file: ${SITE}/llms-full.txt

## Docs

${await section('')}

## Docs (日本語)

${await section('ja/')}

## Optional

- [npm package](https://www.npmjs.com/package/ippon-slides)
- [GitHub repository](https://github.com/under18dev/ippon-slides)
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
