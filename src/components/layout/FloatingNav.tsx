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
    <nav className="fixed right-10 top-1/2 z-40 hidden -translate-y-1/2 md:block">
      <ul className="flex flex-col items-end gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
        {items.map((it) => {
          const on = active === it.id
          return (
            <li key={it.id}>
              <button
                onClick={() => scrollToId(it.id)}
                className={`group flex items-center gap-2 text-[11px] tracking-[0.2em] transition-colors ${
                  on ? 'text-black' : 'text-gray-500 hover:text-black'
                }`}
              >
                {it.label}
                <span
                  className={`h-px transition-all ${
                    on
                      ? 'w-7 bg-black'
                      : 'w-4 bg-gray-300 group-hover:w-6 group-hover:bg-black'
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
