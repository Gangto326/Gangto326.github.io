/** sticky 헤더 높이(대략) — 섹션이 헤더에 가리지 않도록 offset. */
const HEADER_OFFSET = 88

/**
 * 지정 id 요소로 부드럽게 스크롤한다.
 * 이미지·영상·지연 로드(Suspense) 데모가 뒤늦게 마운트되며 높이가 바뀌어도
 * 목표 위치를 재계산해 몇 차례 보정하여 정확히 안착시킨다.
 */
/** 페이지 최상단으로 부드럽게 스크롤 (id 요소 유무와 무관하게 동작) */
export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * 데모 카드가 화면에 가장 편하게 보이는 위치로 스크롤한다.
 * 카드가 뷰포트에 전부 담기면 세로 중앙 정렬, 안 담기면 상단 정렬(헤더 아래).
 * 목표와 현재 위치 차이가 ±24px 이내면 스크롤을 생략해 연속 클릭 시 꿀렁임을 막는다.
 * anchor는 카드 내부 요소여도 된다 — [data-experience-card] 조상을 기준으로 잡는다.
 */
export function scrollDemoIntoView(anchor: HTMLElement | null) {
  if (!anchor) return
  const card = (anchor.closest('[data-experience-card]') as HTMLElement) ?? anchor

  const targetY = () => {
    const r = card.getBoundingClientRect()
    const vh = window.innerHeight
    // 담기면 중앙 오프셋, 단 헤더보다는 아래로. 안 담기면 헤더 아래 상단 정렬.
    const offset =
      r.height <= vh - HEADER_OFFSET
        ? Math.max((vh - r.height) / 2, HEADER_OFFSET)
        : HEADER_OFFSET
    return Math.max(0, r.top + window.scrollY - offset)
  }

  // 뷰 전환 직후 카드 높이가 바뀌므로 렌더 반영 후(rAF) 계산한다
  requestAnimationFrame(() => {
    const t = targetY()
    if (Math.abs(t - window.scrollY) <= 24) return
    window.scrollTo({ top: t, behavior: 'smooth' })
    // 지연 로드(영상·이미지)로 높이가 밀리면 재보정 (최대 2회)
    let tries = 0
    const timer = window.setInterval(() => {
      const t2 = targetY()
      if (Math.abs(t2 - window.scrollY) > 24) {
        window.scrollTo({ top: t2, behavior: 'smooth' })
      }
      if (++tries >= 2) window.clearInterval(timer)
    }, 350)
  })
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return

  const targetY = () =>
    Math.max(0, el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET)

  window.scrollTo({ top: targetY(), behavior: 'smooth' })

  // 지연 로드로 위치가 밀리면 보정(레이아웃 안정될 때까지 최대 4회)
  let tries = 0
  const timer = window.setInterval(() => {
    const t = targetY()
    if (Math.abs(t - window.scrollY) > 4) {
      window.scrollTo({ top: t, behavior: 'smooth' })
    }
    if (++tries >= 4) window.clearInterval(timer)
  }, 350)
}
