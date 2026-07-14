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
