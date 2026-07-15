/** sticky 헤더 높이(대략) — 섹션이 헤더에 가리지 않도록 offset. */
const HEADER_OFFSET = 88

/**
 * 진행 중인 프로그램 스크롤(보정 루프)은 페이지 전체에서 항상 하나 —
 * 새 프로그램 스크롤이 시작되거나 사용자 입력이 감지되면 이전 루프를 즉시 취소한다.
 * (목차 연타·클릭 직후 역방향 휠에서 여러 보정 루프가 서로 싸우며
 *  페이지가 널뛰던 문제의 근본 수정)
 */
let activeCleanup: (() => void) | null = null

/** 진행 중인 보정 루프를 취소한다. 라우트 전환 등 외부에서도 호출 가능. */
export function cancelManagedScroll() {
  activeCleanup?.()
  activeCleanup = null
}

const USER_EVENTS = ['wheel', 'touchstart', 'mousedown', 'keydown'] as const

/**
 * 목표 위치로 부드럽게 스크롤하고, 지연 로드(이미지·영상·Suspense 데모)로
 * 레이아웃이 밀리면 350ms 간격으로 최대 tries회 재보정한다.
 * targetY가 null을 반환하면(예: 목표 요소가 DOM에서 분리됨) 즉시 중단하고,
 * 휠·터치·키 입력 등 사용자 조작이 감지되면 그 즉시 양보한다.
 */
function managedScrollTo(targetY: () => number | null, tries: number) {
  cancelManagedScroll()

  const step = (): boolean => {
    const t = targetY()
    if (t == null) return false
    if (Math.abs(t - window.scrollY) > 4) {
      window.scrollTo({ top: t, behavior: 'smooth' })
    }
    return true
  }

  if (!step()) return

  let left = tries
  const timer = window.setInterval(() => {
    if (!step() || --left <= 0) cancelManagedScroll()
  }, 350)

  const onUserInput = () => cancelManagedScroll()
  USER_EVENTS.forEach((e) =>
    window.addEventListener(e, onUserInput, { passive: true, capture: true }),
  )
  activeCleanup = () => {
    window.clearInterval(timer)
    USER_EVENTS.forEach((e) => window.removeEventListener(e, onUserInput, { capture: true }))
  }
}

/** 페이지 최상단으로 부드럽게 스크롤 (id 요소 유무와 무관하게 동작) */
export function scrollToTop() {
  cancelManagedScroll()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 인터랙션 본체의 최소 상단 여백 — 스티키 내비(≈64px) + 숨쉴 공간.
    바짝 붙이면 답답하다는 피드백으로 중앙 정렬 안착 위치(≈95px)와 비슷하게 맞춘 값. */
const NAV_CLEAR = 96

/**
 * 카드별 목표 오프셋 잠금 — 뷰(모드) 전환으로 본체 높이가 조금씩 달라도
 * 한 인터랙션 안에서는 항상 같은 화면 위치에 안착하도록, 처음 계산한 오프셋을
 * 같은 뷰포트 높이 동안 재사용한다 (리사이즈·회전 시 재계산).
 */
const offsetLock = new WeakMap<HTMLElement, { vh: number; offset: number }>()

/**
 * 데모의 인터랙션 본체([data-experience-body] = 조작·결과 영역)가 가장 잘 보이는
 * 위치로 스크롤한다. 제목·설명·하단 힌트보다 본체 가시성이 우선이다.
 * 본체가 뷰포트에 전부 담기면 본체 중앙 정렬(내비 아래로 클램프), 안 담기면
 * 내비 바로 아래부터 보여준다. 목표와 현재 차이가 ±4px 이내면 생략.
 * anchor는 카드 내부 요소여도 된다 — [data-experience-card] 조상을 기준으로 잡는다.
 */
export function scrollDemoIntoView(anchor: HTMLElement | null) {
  if (!anchor) return
  const card = (anchor.closest('[data-experience-card]') as HTMLElement) ?? anchor
  const body = (card.querySelector('[data-experience-body]') as HTMLElement) ?? card

  const targetY = (): number | null => {
    if (!body.isConnected) return null
    const b = body.getBoundingClientRect()
    const vh = window.innerHeight
    // 본체가 담기면(하단 16px 여유 포함) 중앙 정렬, 내비보다는 아래로. 안 담기면 내비 바로 아래.
    const fresh =
      b.height <= vh - NAV_CLEAR - 16
        ? Math.max((vh - b.height) / 2, NAV_CLEAR)
        : NAV_CLEAR
    // 잠금은 지금까지 본 뷰들의 최솟값으로 수렴 — 더 긴 뷰를 처음 만날 때 한 번만
    // 내려가고, 이후 모든 뷰에서 같은 위치 + 본체 하단 잘림 없음이 함께 보장된다
    // (오프셋이 작아질수록 하단 여유는 커지므로 가시성은 항상 유지).
    const locked = offsetLock.get(card)
    const offset = locked && locked.vh === vh ? Math.min(locked.offset, fresh) : fresh
    offsetLock.set(card, { vh, offset })
    return Math.max(0, b.top + window.scrollY - offset)
  }

  // 뷰 전환 직후 카드 높이가 바뀌므로 렌더 반영 후(rAF) 계산한다.
  // 스킵 허용치 4px — 동일 목표 재클릭의 꿀렁임만 막고, 잠금 수렴에 따른
  // 십수 px 보정(본체 하단 잘림 완화)은 놓치지 않게 좁게 잡는다.
  requestAnimationFrame(() => {
    const t = targetY()
    if (t == null || Math.abs(t - window.scrollY) <= 4) return
    // 지연 로드(영상·이미지)로 높이가 밀리면 재보정 (최대 2회)
    managedScrollTo(targetY, 2)
  })
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return

  // 요소가 DOM에서 분리되면(프로젝트 전환 등) 보정을 즉시 중단한다
  const targetY = (): number | null =>
    el.isConnected
      ? Math.max(0, el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET)
      : null

  // 지연 로드로 위치가 밀리면 보정(레이아웃 안정될 때까지 최대 4회)
  managedScrollTo(targetY, 4)
}
