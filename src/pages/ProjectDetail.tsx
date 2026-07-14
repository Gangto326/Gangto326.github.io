import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { Navbar } from '@/components/layout/Navbar'
import { FloatingNav } from '@/components/layout/FloatingNav'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ExperienceShell } from '@/experiences/ExperienceShell'
import { experienceRegistry } from '@/experiences/registry'
import { projects } from '@/data/projects'
import {
  projectContent,
  type Feature,
  type FeatureMedia as FeatureMediaType,
} from '@/data/projectContent'

/** 본문 내 **강조** 마커를 굵은 글씨로 렌더링 */
function emphasize(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  )
}

const projectNav = [
  { id: 'overview', label: '개요' },
  { id: 'features', label: '기능' },
  { id: 'troubleshooting', label: '문제해결' },
  { id: 'retrospective', label: '회고' },
  { id: 'demo', label: '인터랙션' },
]

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium tracking-widest text-muted-foreground">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
    </div>
  )
}

/** 이미지 준비 전 자리표시 박스 */
function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card text-muted-foreground ${className}`}
    >
      <ImageIcon className="h-6 w-6" aria-hidden="true" />
      <span className="text-xs">이미지 준비 중</span>
    </div>
  )
}

/** 이미지 시퀀스 — 지정 간격(기본 2초)마다 순서대로 crossfade 순환 */
function FeatureSequence({
  srcs,
  interval = 2000,
  ratio,
  order,
  stage = false,
}: {
  srcs: string[]
  interval?: number
  ratio?: string
  order: string
  stage?: boolean
}) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (srcs.length < 2) return
    const id = setInterval(() => setIdx((i) => (i + 1) % srcs.length), interval)
    return () => clearInterval(id)
  }, [srcs.length, interval])
  const r = ratio ?? '16 / 9'
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-border bg-muted ${
        stage ? 'lg:w-[var(--seq-w)]' : ''
      } ${order}`}
      style={{
        aspectRatio: r,
        // 스테이지(높이 440px) 안에서 비율을 유지한 최대 크기: 흰 여백(레터박스) 방지
        ...(stage ? { ['--seq-w']: `min(100%, calc(440px * (${r})))` } : {}),
      } as CSSProperties}
    >
      <AnimatePresence>
        <motion.img
          key={idx}
          src={srcs[idx]}
          alt=""
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </AnimatePresence>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2">
        {srcs.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/45'}`}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * 기능 미디어 — 영상(자동재생·무음), 이미지 시퀀스(2초 순환), 단일 이미지, 없으면 자리표시.
 * stage: lg에서 고정 높이 스테이지(부모 lg:h-[440px] flex) 안에 맞춰 비율 유지 축소.
 */
function FeatureMedia({ media, order, stage = false }: { media?: FeatureMediaType; order: string; stage?: boolean }) {
  const base = import.meta.env.BASE_URL
  if (!media) return <ImagePlaceholder className={`aspect-video w-full ${order}`} />
  if (media.kind === 'video') {
    return (
      <div
        className={`aspect-video w-full overflow-hidden rounded-lg bg-muted ${stage ? 'lg:max-h-full' : ''} ${order}`}
      >
        <video
          src={base + media.src}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
        />
      </div>
    )
  }
  if (media.kind === 'sequence') {
    return (
      <FeatureSequence
        srcs={media.srcs.map((s) => base + s)}
        interval={media.interval}
        ratio={media.ratio}
        order={order}
        stage={stage}
      />
    )
  }
  if (media.kind === 'montage') {
    // stage에서 flex-none을 쓰면 가로형 이미지가 컬럼을 넘어 텍스트를 덮는다 —
    // flex-initial + max-h로 세로형은 높이에, 가로형은 컬럼 폭에 맞춰 축소한다
    return (
      <div
        className={`flex min-w-0 items-start gap-3 ${
          stage ? 'lg:h-full lg:max-w-full lg:items-center lg:justify-center' : ''
        } ${order}`}
      >
        {media.srcs.map((s) => (
          <img
            key={s}
            src={base + s}
            alt=""
            className={`min-w-0 flex-1 rounded-lg border border-border bg-muted ${
              stage ? 'lg:h-auto lg:max-h-full lg:w-auto lg:flex-initial' : ''
            }`}
          />
        ))}
      </div>
    )
  }
  return (
    <img
      src={base + media.src}
      alt=""
      className={`block w-full rounded-lg border border-border bg-muted ${
        stage ? 'lg:h-auto lg:max-h-full lg:w-auto lg:max-w-full' : ''
      } ${order}`}
    />
  )
}

/** 터치 기기 여부 — 드래그 제스처는 터치에서만 활성화 (데스크톱은 휠·화살표) */
function useIsTouch() {
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setTouch(mq.matches || 'ontouchstart' in window)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return touch
}

/**
 * 요소 위에서 트랙패드·휠 가로 스와이프만으로 슬라이드를 넘기게 한다.
 * React onWheel은 passive라 preventDefault가 불가 — 네이티브 리스너로 등록해
 * 브라우저 뒤로가기 스와이프를 막는다. 수직 스크롤은 그대로 통과.
 */
function useWheelSlide(ref: RefObject<HTMLElement | null>, step: (dir: 1 | -1) => void) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let acc = 0
    let locked = false
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      if (locked) return
      acc += e.deltaX
      if (Math.abs(acc) > 60) {
        step(acc > 0 ? 1 : -1)
        acc = 0
        locked = true
        window.setTimeout(() => {
          locked = false
          acc = 0
        }, 550)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [ref, step])
}

/**
 * 핵심 기능 슬라이드 쇼케이스.
 * 드래그(스와이프)로 넘기는 캐러셀 — 박스 없이 고스트 넘버 + 기울어진 미디어 +
 * 프로젝트 액센트 블롭으로 구성한 자유 레이아웃.
 */
function FeatureShowcase({ features, accent }: { features: Feature[]; accent: string }) {
  const [idx, setIdx] = useState(0)
  const go = (n: number) => setIdx(Math.min(features.length - 1, Math.max(0, n)))

  const wrapRef = useRef<HTMLDivElement>(null)
  const step = useCallback(
    (dir: 1 | -1) => setIdx((i) => Math.min(features.length - 1, Math.max(0, i + dir))),
    [features.length],
  )
  useWheelSlide(wrapRef, step)
  const isTouch = useIsTouch()

  return (
    <div ref={wrapRef} className="relative mt-6 sm:mt-8">
      {/* 트랙 내부 버튼 포커스 시 브라우저가 overflow-hidden 컨테이너를 임의로
          스크롤(scroll-into-view)해 슬라이드가 어긋나는 것을 방지 */}
      <div
        className="overflow-hidden"
        onScroll={(e) => {
          e.currentTarget.scrollLeft = 0
        }}
      >
        <motion.div
          className={`flex touch-pan-y select-none ${isTouch ? 'cursor-grab active:cursor-grabbing' : ''}`}
          {...(isTouch
            ? {
                drag: 'x' as const,
                dragConstraints: { left: 0, right: 0 },
                dragElastic: 0.12,
                onDragEnd: (_: unknown, info: PanInfo) => {
                  if (info.offset.x < -70 || info.velocity.x < -400) go(idx + 1)
                  else if (info.offset.x > 70 || info.velocity.x > 400) go(idx - 1)
                },
              }
            : {})}
          animate={{ x: `${-idx * 100}%` }}
          transition={{ type: 'spring', stiffness: 260, damping: 34 }}
        >
          {features.map((f, i) => (
            <div key={i} className="w-full shrink-0 px-1" aria-hidden={i !== idx}>
              <div className="grid items-center gap-8 py-8 lg:grid-cols-[0.42fr_0.58fr] lg:gap-16">
                <div className="order-2 min-w-0 lg:order-1">
                  <span className="block select-none text-7xl font-extralight leading-none tracking-tighter text-foreground/10 sm:text-8xl">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="-mt-4 text-2xl font-semibold tracking-tight sm:-mt-6 sm:text-3xl">
                    {f.title}
                  </h3>
                  <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">{f.desc}</p>
                </div>

                <div className="relative order-1 min-w-0 lg:order-2">
                  <div
                    aria-hidden="true"
                    className={`absolute inset-4 rounded-full bg-gradient-to-br ${accent} opacity-30 blur-3xl dark:opacity-15`}
                  />
                  <div
                    className={`drop-shadow-lg transition-transform duration-300 lg:flex lg:h-[440px] lg:items-center lg:justify-center [&_img]:pointer-events-none [&_video]:pointer-events-none ${
                      i % 2 === 1 ? 'lg:-rotate-1' : 'lg:rotate-1'
                    }`}
                  >
                    <FeatureMedia media={f.media} order="" stage />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* 컨트롤 — 세그먼트 + 카운터 + 화살표 */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {features.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`${i + 1}번 기능 보기`}
                className={`h-1 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  i === idx ? 'w-8 bg-foreground' : 'w-3 bg-foreground/15 hover:bg-foreground/40'
                }`}
              />
            ))}
          </div>
          <span className="text-xs tabular-nums tracking-widest text-muted-foreground">
            {String(idx + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 hidden items-center gap-1 text-xs font-medium tracking-widest text-muted-foreground sm:inline-flex">
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
            SWIPE
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => go(idx - 1)}
            disabled={idx === 0}
            aria-label="이전 기능"
            className="h-9 w-9 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => go(idx + 1)}
            disabled={idx === features.length - 1}
            aria-label="다음 기능"
            className="h-9 w-9 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const project = projects.find((p) => p.id === id)
  const content = id ? projectContent[id] : undefined
  const [tIdx, setTIdx] = useState(0)

  // 트러블슈팅 — 컴포넌트 위 가로 스와이프만으로 넘김 (훅은 early return 이전에 호출)
  const isTouch = useIsTouch()
  const tsRef = useRef<HTMLElement>(null)
  const tsLen = content?.troubleshooting.length ?? 0
  const tsStep = useCallback(
    (dir: 1 | -1) => setTIdx((i) => Math.min(tsLen - 1, Math.max(0, i + dir))),
    [tsLen],
  )
  useWheelSlide(tsRef, tsStep)

  if (!project || !content) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <Container className="py-32 text-center">
          <p className="text-muted-foreground">프로젝트를 찾을 수 없습니다.</p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-sm text-sm text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            홈으로 돌아가기
          </Link>
        </Container>
        <Footer />
      </div>
    )
  }

  const Demo = experienceRegistry[project.id]
  const ts = content.troubleshooting
  const cur = ts[tIdx]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <FloatingNav items={projectNav} />
      <Container className="py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> ALL PROJECTS
        </Link>

        {/* 헤더 */}
        <header className="mt-8 border-b border-border pb-12">
          <span className="text-sm tabular-nums text-muted-foreground">{project.index}</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tighter sm:text-5xl">
            {project.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {project.nameKo} · {project.tagline}
          </p>
          <p className="mt-6 max-w-2xl text-balance leading-relaxed text-foreground">
            {project.highlight}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-card-foreground shadow-sm"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="text-xs tracking-wide text-muted-foreground">
              {project.role} · {project.meta}
            </span>
            {project.github && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full text-xs text-muted-foreground hover:text-foreground"
              >
                <a href={project.github} target="_blank" rel="noreferrer">
                  <GithubIcon className="h-4 w-4" /> GitHub
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </header>

        {/* 대표 이미지 히어로 */}
        {project.thumb && (
          <Card className="mt-10 overflow-hidden">
            <img
              src={import.meta.env.BASE_URL + project.thumb}
              alt={`${project.name} 대표 이미지`}
              className="block w-full object-contain"
            />
          </Card>
        )}

        {/* 개요 */}
        <section id="overview" className="scroll-mt-24 py-16">
          <SectionHeading eyebrow="OVERVIEW" title="프로젝트 개요" />
          <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
            {content.overview}
          </p>
        </section>

        {/* 핵심 기능 — 목록 + 미디어 스테이지 쇼케이스 */}
        <section id="features" className="scroll-mt-24 border-t border-border py-16">
          <SectionHeading eyebrow="FEATURES" title="핵심 기능" />
          <FeatureShowcase features={content.features} accent={project.accent} />
        </section>

        {/* 트러블슈팅 — 가로 배치 + 수동 슬라이드 */}
        <section
          id="troubleshooting"
          ref={tsRef}
          className="scroll-mt-24 border-t border-border py-16"
        >
          <div className="flex items-end justify-between gap-4">
            <SectionHeading eyebrow="TROUBLESHOOTING" title="기술적 문제 해결" />
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-muted-foreground">
                {tIdx + 1} / {ts.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTIdx((i) => Math.max(0, i - 1))}
                disabled={tIdx === 0}
                aria-label="이전 트러블슈팅"
                className="h-9 w-9 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTIdx((i) => Math.min(ts.length - 1, i + 1))}
                disabled={tIdx === ts.length - 1}
                aria-label="다음 트러블슈팅"
                className="h-9 w-9 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <motion.article
            key={tIdx}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            {...(isTouch
              ? {
                  drag: 'x' as const,
                  dragConstraints: { left: 0, right: 0 },
                  dragElastic: 0.1,
                  onDragEnd: (_: unknown, info: PanInfo) => {
                    if (info.offset.x < -70 || info.velocity.x < -400)
                      setTIdx((i) => Math.min(ts.length - 1, i + 1))
                    else if (info.offset.x > 70 || info.velocity.x > 400)
                      setTIdx((i) => Math.max(0, i - 1))
                  },
                }
              : {})}
            className={`mt-8 touch-pan-y rounded-lg border border-border bg-card p-6 shadow-sm sm:p-10 ${
              isTouch ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
          >
            <h3 className="text-lg font-semibold tracking-tight sm:text-xl">
              {cur.title}
            </h3>
            <div className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-8">
              {[
                { k: '문제', v: cur.problem, dot: 'bg-danger' },
                { k: '해결', v: cur.solution, dot: 'bg-info' },
                { k: '결과', v: cur.result, dot: 'bg-success' },
              ].map((col) => (
                <div key={col.k}>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium tracking-widest text-secondary-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} aria-hidden="true" />
                    {col.k}
                  </span>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {emphasize(col.v)}
                  </p>
                </div>
              ))}
            </div>
          </motion.article>

          {/* 점 인디케이터 */}
          <div className="mt-6 flex justify-center gap-2">
            {ts.map((_, i) => (
              <button
                key={i}
                onClick={() => setTIdx(i)}
                aria-label={`${i + 1}번 트러블슈팅`}
                className={`h-1.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  i === tIdx ? 'w-6 bg-foreground' : 'w-1.5 bg-foreground/20'
                }`}
              />
            ))}
          </div>
        </section>

        {/* 회고 — 포인트 굵게 */}
        <section id="retrospective" className="scroll-mt-24 border-t border-border py-16">
          <SectionHeading eyebrow="RETROSPECTIVE" title="회고" />
          <div className="mt-8 space-y-8">
            {content.retrospective.map((r, i) => (
              <div key={i} className="max-w-2xl border-l-2 border-border pl-6">
                <h3 className="text-lg font-semibold tracking-tight">
                  {r.heading}
                </h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {emphasize(r.body)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 체험형 데모 (맨 아래) */}
        <section id="demo" className="scroll-mt-24 border-t border-border py-16">
          {Demo ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center rounded-lg border border-border bg-card py-24 text-center text-sm text-muted-foreground">
                  체험 로딩 중…
                </div>
              }
            >
              <Demo />
            </Suspense>
          ) : (
            <ExperienceShell
              title={project.experience}
              subtitle="인터랙티브 데모 준비 중"
            >
              <div className="flex items-center justify-center rounded-lg border border-dashed border-black/15 py-16 text-center text-sm text-gray-400">
                곧 이 자리에서 직접 조작하며 핵심 원리를 체험할 수 있습니다.
              </div>
            </ExperienceShell>
          )}
        </section>
      </Container>
      <Footer />
    </div>
  )
}
