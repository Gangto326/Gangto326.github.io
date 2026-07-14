import { useEffect, useState } from 'react'
import { scrollToId } from '@/lib/scroll'

export interface FloatingNavItem {
  id: string
  label: string
}

/**
 * 우측 세로 플로팅 내비. 화면을 따라다니며, 현재 보이는 섹션을 활성 표시한다.
 * 항목은 페이지별로 주입한다(홈: PROJECTS·ABOUT / 프로젝트 상세: 해당 섹션들).
 */
export function FloatingNav({ items }: { items: FloatingNavItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null)

  // 스크롤 기준선 방식: 뷰포트 상단 40% 선을 지난 마지막 섹션을 활성으로.
  // (IntersectionObserver의 좁은 판정 밴드는 뷰포트보다 긴 섹션·빠른 휠에서
  //  기능·회고를 놓치는 문제가 있어 스크롤 위치 계산으로 교체)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const line = window.innerHeight * 0.4
      // 페이지 끝에 닿으면 마지막 섹션을 활성 (짧은 마지막 섹션도 도달 가능하게)
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      let current: string | null = null
      for (const it of items) {
        const el = document.getElementById(it.id)
        if (el && el.getBoundingClientRect().top <= line) current = it.id
      }
      if (atBottom) current = items[items.length - 1]?.id ?? current
      setActive(current ?? items[0]?.id ?? null)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [items])

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
                  className={`text-xs font-medium tracking-widest transition-all duration-300 ${
                    on
                      ? 'translate-x-0 text-foreground opacity-100'
                      : 'translate-x-2 text-muted-foreground opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                  }`}
                >
                  {it.label}
                </span>
                <span
                  className={`h-0.5 rounded-full transition-all duration-300 ${
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
