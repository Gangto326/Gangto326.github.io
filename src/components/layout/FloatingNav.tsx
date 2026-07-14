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

  useEffect(() => {
    const els = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => !!el)
    if (!els.length) return

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
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
