import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { projects } from '@/data/projects'

const BASE = import.meta.env.BASE_URL

/**
 * 하단 중앙 프로젝트 독 — 프로젝트 상세 페이지 전용.
 * 평소엔 "01 / 04" + 미니 타일의 접힌 알약으로 본문 가림을 최소화하고,
 * 호버/키보드 포커스 시 독으로 확장된다. 호버가 없는 터치(패드)에선 접힘 상태
 * 첫 탭이 내비게이션 대신 확장으로 동작하고, 바깥 탭으로 접힌다.
 * 스크롤 다운 중엔 아래로 숨고 업 시 복귀.
 * 모바일(<md)은 숨김 — OTHER PROJECTS 섹션이 대신한다.
 */
export function ProjectDock({ currentId }: { currentId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [hidden, setHidden] = useState(false)
  // 데모(인터랙션) 섹션을 지나 독이 아무것도 가리지 않는 구간 — 확장 고정, 숨김 없음
  const [pinned, setPinned] = useState(false)
  const [hoverTile, setHoverTile] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const current = projects.find((p) => p.id === currentId)

  // 스크롤 방향 감지 — 내리는 동안만 숨기고, 올리거나 멈추면 곧바로 복귀(idle-reveal).
  // 정지 판정 150ms: 이보다 짧으면 연속 휠 틱 사이를 '정지'로 오인해 독이 들락날락한다.
  // (scrollend 이벤트는 휠 틱 하나의 끝마다 발화해 스크롤 중 숨김이 아예 안 되므로 사용 불가)
  // 데모 하단이 독 점유 영역(하단 110px) 위로 올라오면 pinned — 확장 고정·숨김 해제.
  useEffect(() => {
    let lastY = window.scrollY
    let raf = 0
    let idleTimer: number | undefined
    const update = () => {
      raf = 0
      const y = window.scrollY
      const dy = y - lastY
      const demo = document.getElementById('demo')
      const pin = demo
        ? demo.getBoundingClientRect().bottom <= window.innerHeight - 110
        : false
      setPinned(pin)
      if (pin) {
        setHidden(false)
      } else if (Math.abs(dy) > 8) {
        setHidden(dy > 0 && y > 200)
      }
      if (Math.abs(dy) > 8) lastY = y
    }
    const onScroll = () => {
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(() => setHidden(false), 150)
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.clearTimeout(idleTimer)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // 숨김 전환 시 확장 상태·툴팁도 정리
  useEffect(() => {
    if (hidden) {
      setExpanded(false)
      setHoverTile(null)
    }
  }, [hidden])

  const collapse = () => {
    setExpanded(false)
    setHoverTile(null)
  }

  // 터치에는 mouseleave가 없으므로 확장 중 바깥 탭/클릭으로 접는다
  useEffect(() => {
    if (!expanded) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setExpanded(false)
        setHoverTile(null)
      }
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [expanded])

  const isExpanded = expanded || pinned

  return (
    <motion.div
      ref={rootRef}
      style={{ x: '-50%' }}
      initial={{ y: 110 }}
      animate={{ y: hidden && !pinned ? 110 : 0 }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
      className="fixed bottom-5 left-1/2 z-40 hidden md:block"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={collapse}
      onFocus={() => setExpanded(true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) collapse()
      }}
    >
      <nav
        aria-label="프로젝트 바로가기"
        className={`surface-card flex items-end gap-2 rounded-full border border-border bg-background/80 shadow-lg backdrop-blur transition-[padding] duration-200 ${
          isExpanded ? '' : 'cursor-pointer'
        }`}
        style={{ padding: isExpanded ? '10px 16px' : '8px 12px' }}
        onClick={() => {
          if (!isExpanded) setExpanded(true)
        }}
      >
        {/* 현재 위치 라벨 — 접힘 상태의 정체성. 확장 시엔 타일이 말하므로 숨김 */}
        <AnimatePresence initial={false}>
          {!isExpanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden whitespace-nowrap pl-1 text-[11px] tabular-nums tracking-widest text-muted-foreground"
            >
              {current?.index ?? '01'} / {String(projects.length).padStart(2, '0')}
            </motion.span>
          )}
        </AnimatePresence>

        <ul className="flex items-end gap-2">
          {projects.map((p) => {
            const on = p.id === currentId
            return (
              <li key={p.id} className="relative">
                <Link
                  to={`/project/${p.id}`}
                  aria-label={`${p.name} — ${p.tagline}`}
                  aria-current={on ? 'page' : undefined}
                  onMouseEnter={() => setHoverTile(p.id)}
                  onMouseLeave={() => setHoverTile(null)}
                  onFocus={() => setHoverTile(p.id)}
                  onBlur={() => setHoverTile(null)}
                  onClick={(e) => {
                    // 접힘 상태의 첫 탭/클릭은 내비게이션 대신 확장 — 호버 없는 터치 대응
                    if (!isExpanded) {
                      e.preventDefault()
                      setExpanded(true)
                      return
                    }
                    collapse()
                  }}
                  className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <motion.span
                    initial={false}
                    animate={{
                      width: isExpanded ? 88 : 30,
                      height: isExpanded ? 56 : 20,
                    }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={`block overflow-hidden rounded-md border bg-muted/50 transition-[opacity,box-shadow,border-color] duration-200 ${
                      on
                        ? 'border-[hsl(var(--glow)/0.7)] opacity-100 shadow-[0_0_16px_-4px_hsl(var(--glow)/0.5)]'
                        : 'border-border opacity-55 hover:opacity-100'
                    }`}
                  >
                    {p.thumb ? (
                      <img
                        src={BASE + p.thumb}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className={`block h-full w-full bg-gradient-to-br ${p.accent}`} />
                    )}
                  </motion.span>
                </Link>

                {/* 타일 위 라벨 — 확장 상태에서 타일 호버/포커스 시 */}
                <AnimatePresence>
                  {isExpanded && hoverTile === p.id && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-3 -translate-x-1/2">
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="surface-card w-max max-w-[240px] rounded-lg border border-border bg-card px-3 py-2 shadow-lg"
                      >
                        <p className="flex items-baseline gap-2 whitespace-nowrap">
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {p.index}
                          </span>
                          <span className="text-sm font-semibold tracking-tight text-card-foreground">
                            {p.name}
                          </span>
                          {on && (
                            <span className="text-[10px] tracking-widest text-muted-foreground">
                              · 현재
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
                          {p.tagline}
                        </p>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </nav>
    </motion.div>
  )
}
