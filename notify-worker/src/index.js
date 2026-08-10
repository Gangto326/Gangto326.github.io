// 포트폴리오 방문 알림 Worker
// 사이트에서 sendBeacon(POST)으로 방문 신호를 받아 디스코드 웹훅으로 전달한다.
// 알림에는 유입 경로만 담는다 — 방문 시각은 디스코드 메시지 수신 시각으로 확인.
// 웹훅 URL은 공개 리포에 노출되면 GitHub이 자동 폐기하므로 반드시 secret으로 주입한다:
//   npx wrangler secret put DISCORD_WEBHOOK_URL

const ALLOWED_ORIGIN = 'https://gangto326.github.io'

const BOT_UA =
  /bot|crawl|spider|slurp|preview|lighthouse|headless|puppeteer|playwright|facebookexternalhit|whatsapp|telegram/i

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('ok')
    if ((request.headers.get('Origin') || '') !== ALLOWED_ORIGIN)
      return new Response('forbidden', { status: 403 })

    const ua = request.headers.get('User-Agent') || ''
    if (BOT_UA.test(ua)) return new Response('skip', { status: 202 })

    let data = {}
    try {
      data = JSON.parse(await request.text())
    } catch {}

    const ref = String(data.ref || '').slice(0, 200) || '직접 방문'

    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: '👀 포트폴리오 방문',
            color: 0x5865f2,
            fields: [{ name: '유입 경로', value: ref }],
          },
        ],
      }),
    })

    return new Response('sent', { status: 202 })
  },
}
