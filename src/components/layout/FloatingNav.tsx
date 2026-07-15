import { useEffect, useRef, useState } from 'react'
import { scrollToId } from '@/lib/scroll'

export interface FloatingNavItem {
  id: string
  label: string
}

/** 지수 평활 시간 상수(ms) — 클수록 느긋하게, 작을수록 민첩하게 목표를 따라간다 */
const TAU = 170

/**
 * 우측 세로 플로팅 내비. 화면을 따라다니며, 현재 보이는 섹션을 활성 표시한다.
 * 항목은 페이지별로 주입한다(홈: PROJECTS·ABOUT / 프로젝트 상세: 해당 섹션들).
 *
 * 활성 표시는 연속값 추적: 스크롤 위치를 소수점 인덱스(섹션 간 진행률 보간)로
 * 환산한 target을, rAF 루프의 지수 평활로 shown이 따라간다. 스크롤이 시작되면
 * 즉시 움직이기 시작해 함께 흐르고, 멈추면 ease-out으로 안착한다. 연속값이므로
 * 아무리 빠른 스크롤에도 중간 항목을 건너뛰는 것이 원천적으로 불가능하다.
 */
export function FloatingNav({ items }: { items: FloatingNavItem[] }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const shownRef = useRef(0)
  const targetRef = useRef(0)
  const activeRef = useRef(0)
  const rafRef = useRef(0)
  const lastTickRef = useRef(0)

  useEffect(() => {
    // 스크롤 기준선(뷰포트 상단 40%)을 지난 마지막 섹션 i에, 다음 섹션까지의
    // 진행률(0~1)을 더한 연속값. 페이지 최하단이면 마지막 인덱스로 수렴.
    // (IntersectionObserver의 좁은 판정 밴드는 뷰포트보다 긴 섹션·빠른 휠에서
    //  기능·회고를 놓치는 문제가 있어 스크롤 위치 계산을 유지)
    const computeTarget = (): number => {
      const line = window.innerHeight * 0.4
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        return items.length - 1
      }
      const tops = items.map(
        (it) => document.getElementById(it.id)?.getBoundingClientRect().top ?? Infinity,
      )
      let t = 0
      for (let i = 0; i < items.length; i++) {
        if (tops[i] > line) break
        if (i === items.length - 1 || tops[i + 1] === Infinity) {
          t = i
        } else {
          const span = tops[i + 1] - tops[i]
          t = span > 0 ? i + Math.min(1, (line - tops[i]) / span) : i
        }
      }
      return t
    }

    // 활성 항목 전환에 ±0.05의 히스테리시스 — 경계(x.5)에 머물 때 떨림 방지
    const commit = () => {
      const shown = shownRef.current
      if (Math.abs(shown - activeRef.current) > 0.55) {
        const next = Math.max(0, Math.min(items.length - 1, Math.round(shown)))
        if (next !== activeRef.current) {
          activeRef.current = next
          setActiveIdx(next)
        }
      }
    }

    const tick = (now: number) => {
      const dt = lastTickRef.current ? Math.min(64, now - lastTickRef.current) : 16
      lastTickRef.current = now
      const k = 1 - Math.exp(-dt / TAU)
      shownRef.current += (targetRef.current - shownRef.current) * k
      if (Math.abs(targetRef.current - shownRef.current) < 0.001) {
        // 수렴 — 루프 정지 (유휴 시 rAF가 돌지 않게), 다음 스크롤이 재시작한다
        shownRef.current = targetRef.current
        rafRef.current = 0
        lastTickRef.current = 0
        commit()
        return
      }
      commit()
      rafRef.current = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      targetRef.current = computeTarget()
      if (!rafRef.current) {
        lastTickRef.current = 0
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    // 첫 측정(마운트·새로고침 직후)은 애니메이션 없이 즉시 현재 위치 표시
    const initial = computeTarget()
    targetRef.current = initial
    shownRef.current = initial
    activeRef.current = Math.round(initial)
    setActiveIdx(Math.round(initial))

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      lastTickRef.current = 0
    }
  }, [items])

  const active = items[Math.min(activeIdx, items.length - 1)]?.id ?? null

  return (
    <nav className="fixed right-7 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <ul className="flex flex-col items-end gap-4">
        {items.map((it) => {
          const on = active === it.id
          return (
            <li key={it.id}>
              <button
                onClick={() => scrollToId(it.id)}
                aria-label={it.label}
                aria-current={on ? 'true' : undefined}
                className="group flex items-center gap-2 rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <span
                  className={`text-xs font-medium tracking-widest transition-all duration-[400ms] ease-out ${
                    on
                      ? 'translate-x-0 text-foreground opacity-100'
                      : 'translate-x-2 text-muted-foreground opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                  }`}
                >
                  {it.label}
                </span>
                <span
                  className={`h-0.5 rounded-full transition-all duration-[400ms] ease-out ${
                    on
                      ? 'w-8 bg-foreground'
                      : 'w-4 bg-foreground/20 group-hover:w-6 group-hover:bg-foreground/50'
                  }`}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
