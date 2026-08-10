// 방문 시 알림 Worker로 신호를 1회 보낸다 (세션당 1번).
// - 개발 모드에서는 보내지 않음
// - URL에 'noping'을 한 번 붙여 접속하면 그 브라우저는 영구 제외됨 (본인 기기 등록용)
//   예: https://gangto326.github.io/#noping
const ENDPOINT = 'https://portfolio-visit-notify.notify-worker.workers.dev'

export function pingVisit(): void {
  try {
    if (import.meta.env.DEV) return
    if (location.hash.includes('noping') || location.search.includes('noping')) {
      localStorage.setItem('visit-ping-off', '1')
    }
    if (localStorage.getItem('visit-ping-off') === '1') return
    if (sessionStorage.getItem('visit-pinged')) return
    sessionStorage.setItem('visit-pinged', '1')
    // text/plain 전송이라 preflight 없이 전달됨. 실패해도 사이트 동작에는 영향 없음.
    navigator.sendBeacon(ENDPOINT, JSON.stringify({ ref: document.referrer }))
  } catch {
    // 추적 실패는 무시 — 사이트 본기능을 방해하지 않는다
  }
}
