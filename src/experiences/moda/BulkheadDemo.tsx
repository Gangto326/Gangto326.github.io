import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Bell, Check, Clock, Database, Globe, Loader2, Search, Server, Zap } from 'lucide-react'
import { ExperienceShell } from '@/experiences/ExperienceShell'

/**
 * MODA — 쓰레드풀 고갈 Bulkhead 시뮬레이터.
 *
 * docs/project4의 "MODA API Request Handling" 다이어그램과 실제 소스(moda-api·moda-nlp) 기준.
 * OFF(개선 전): 블로킹 크롤링(Selenium)을 moda-api가 직접 실행 → ForkJoinPool.commonPool
 * (2vCPU→3슬롯) 고갈 → 검색까지 연쇄 정지. ON(개선 후): (1) 일반 URL 카드 크롤링을 WebClient
 * 논블로킹으로 FastAPI 서버에 위임(경량 httpx·BeautifulSoup·GraphQL, Selenium 완전 제거) →
 * moda-api 스레드 미점유, (2) 블로킹 작업은 Bulkhead 4개 격리 풀(이미지 처리·DB 저장·검색 쿼리·
 * 유튜브 폴링)로 분리, (3) 검색은 전용 fixed:10 풀. 이미지 처리 풀 큐 초과 시 즉시 503+FCM
 * (fail-fast). 수치는 실측값. 외부 의존성 없는 프론트 시뮬레이션.
 */

type Mode = 'off' | 'on'

// 실측 상수
const SHARED_SLOTS = 3 // commonPool = vCPU-1 (t3.medium 2vCPU)
const IMG_MAX = 4 // 이미지 처리 풀 (imageExecutor) core2/max4
const IMG_QUEUE = 50 // 이미지 처리 풀 queue
const SEARCH_POOL = 10 // 검색 쿼리 풀 (executorService) fixed 10
const SEARCH_COUNT = 3 // 동시에 들어오는 검색/메인 요청(고정, 시각화용)
const BURST = 60 // "폭주" 시 동시 이미지 카드 (큐 초과 → 503)

const AMBER = '#f59e0b'
const EMERALD = '#10b981'
const SLATE = '#94a3b8'

interface Metric {
  k: string
  off: string
  on: string
}
const METRICS: Metric[] = [
  { k: '동시 처리 한계', off: '3건', on: '10건 전부 성공' },
  { k: 'CPU 피크', off: '5.2%', on: '1.21% (−77%)' },
  { k: '크롤링(SSR) 시간', off: '10~25초 (Selenium)', on: '0.17~0.57초 (경량)' },
  { k: 'Selenium 사용', off: '100%', on: '0% (완전 제거)' },
  { k: '검색 응답', off: '연쇄 정지', on: '정상' },
]

export function BulkheadDemo() {
  const [mode, setMode] = useState<Mode>('off')
  const [n, setN] = useState(3)
  const [overload, setOverload] = useState(false)

  const on = mode === 'on'
  const req = overload && on ? BURST : n

  // OFF: 공유 commonPool(3슬롯)을 크롤링이 점유 → 남는 슬롯만 검색이 사용
  const sharedCrawl = Math.min(req, SHARED_SLOTS)
  const searchRunningOff = Math.max(0, SHARED_SLOTS - sharedCrawl)
  const searchBlockedOff = SEARCH_COUNT - Math.min(SEARCH_COUNT, searchRunningOff)
  const meltdown = !on && req >= SHARED_SLOTS

  // ON: 이미지 처리 풀(max4 + queue50) — 큐 초과분은 503
  const imgRunning = Math.min(req, IMG_MAX)
  const imgQueued = Math.min(Math.max(0, req - IMG_MAX), IMG_QUEUE)
  const imgRejected = Math.max(0, req - IMG_MAX - IMG_QUEUE)

  const reset = () => {
    setMode('off')
    setN(3)
    setOverload(false)
  }
  const selectMode = (m: Mode) => {
    setMode(m)
    if (m === 'off') setOverload(false)
  }

  return (
    <ExperienceShell
      title="쓰레드풀 고갈 Bulkhead 시뮬레이터"
      subtitle="URL·유튜브·이미지 카드 생성과 검색이 한 서버로 들어옵니다. Bulkhead를 켜고 꺼서, 블로킹 크롤링이 공유풀을 점유해 검색까지 멈추는 문제와 풀을 격리해 서로 보호하는 개선을 비교하세요."
      hint="OFF는 블로킹 크롤링(Selenium)을 moda-api가 직접 실행해 ForkJoinPool.commonPool(2vCPU→3슬롯)에서 돌던 개선 전 상태로, 동시 3~4건이면 검색·메인페이지까지 연쇄 정지합니다. ON에서는 다이어그램대로 (1) 일반 URL 카드 크롤링을 WebClient 논블로킹으로 FastAPI 서버에 위임(경량 httpx·BeautifulSoup·GraphQL로 전환, Selenium 100%→0% 완전 제거)해 moda-api 스레드를 붙잡지 않고, (2) 블로킹 작업은 Bulkhead 격리 풀(이미지 처리·DB 저장·검색 쿼리·유튜브 폴링)로 분리하며, (3) 검색은 전용 fixed:10 풀로 돕니다. 이미지 처리 풀 큐가 차면 무한 대기 대신 즉시 503+FCM으로 실패(fail-fast). 수치는 실측값(동시 3→10건, CPU −77%)."
      onReset={reset}
    >
      {/* 모드 토글 + 슬라이더 */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          {(
            [
              { k: 'off', label: 'Bulkhead OFF · 공유풀' },
              { k: 'on', label: 'Bulkhead ON · 격리풀' },
            ] as { k: Mode; label: string }[]
          ).map((m) => (
            <button
              key={m.k}
              onClick={() => selectMode(m.k)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                mode === m.k ? 'bg-black text-white' : 'border border-black/15 text-gray-600 hover:border-black'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-3 text-sm">
          <span className="shrink-0 text-gray-500">동시 요청</span>
          <input
            type="range"
            min={1}
            max={12}
            step={1}
            value={n}
            onChange={(e) => {
              setN(Number(e.target.value))
              setOverload(false)
            }}
            className="flex-1 accent-black"
            aria-label="동시 요청 수"
          />
          <span className="w-14 shrink-0 tabular-nums text-gray-700">{overload && on ? `${BURST}건` : `${n}건`}</span>
        </div>
      </div>

      {/* 상태 배너 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${mode}-${meltdown}-${imgRejected > 0}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`mb-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            meltdown ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-emerald-200 bg-emerald-50 text-emerald-600'
          }`}
        >
          {meltdown ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>서버 먹통</strong> — 크롤링이 공유 commonPool 3슬롯을 모두 점유해 검색·메인페이지까지 연쇄 정지했습니다.
              </span>
            </>
          ) : on ? (
            <>
              <Check className="h-4 w-4 shrink-0" />
              <span>
                <strong>정상</strong> — 크롤링은 FastAPI에 논블로킹 위임, 블로킹 작업은 격리 풀, 검색은 fixed:10에서 독립 응답합니다
                {imgRejected > 0 ? `. 이미지 처리 풀 큐(50) 초과분 ${imgRejected}건은 즉시 503+FCM으로 실패(fail-fast).` : '.'}
              </span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 shrink-0" />
              <span>
                공유풀에 여유가 있어 아직은 검색이 응답합니다. 동시 요청을 <strong>3건</strong> 이상으로 올려 보세요.
              </span>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 시각화 */}
      <AnimatePresence mode="wait">
        {on ? (
          <OnView
            key="on-view"
            req={req}
            imgRunning={imgRunning}
            imgQueued={imgQueued}
            imgRejected={imgRejected}
            overload={overload}
            onOverload={() => setOverload((v) => !v)}
          />
        ) : (
          <OffView key="off-view" crawl={sharedCrawl} searchRunning={searchRunningOff} searchBlocked={searchBlockedOff} queued={req - sharedCrawl} />
        )}
      </AnimatePresence>

      {/* 실측 지표 비교 */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
        <div className="grid grid-cols-3 border-b border-black/10 bg-gray-50 px-4 py-2 text-[11px] tracking-widest text-gray-400">
          <span>지표</span>
          <span className="text-center">OFF · 공유풀</span>
          <span className="text-center">ON · 격리풀</span>
        </div>
        {METRICS.map((m) => (
          <div key={m.k} className="grid grid-cols-3 items-center px-4 py-2.5 text-sm odd:bg-white even:bg-gray-50/50">
            <span className="text-gray-600">{m.k}</span>
            <span className={`text-center tabular-nums ${!on ? 'font-medium text-rose-500' : 'text-gray-400'}`}>{m.off}</span>
            <span className={`text-center tabular-nums ${on ? 'font-medium text-emerald-600' : 'text-gray-400'}`}>{m.on}</span>
          </div>
        ))}
      </div>
    </ExperienceShell>
  )
}

// ── OFF: 공유 commonPool — 크롤링(Selenium)이 슬롯 점유 → 검색 연쇄 정지 ────────
function OffView({ crawl, searchRunning, searchBlocked, queued }: { crawl: number; searchRunning: number; searchBlocked: number; queued: number }) {
  const meltdown = searchBlocked > 0
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
      <PoolHeader icon={<Server className="h-4 w-4" />} title="ForkJoinPool.commonPool()" sub={`공유 · ${SHARED_SLOTS}슬롯 (vCPU−1) · 크롤링·검색이 함께 사용`} tone={meltdown ? 'danger' : 'neutral'} />
      <div className="mt-3 flex flex-wrap gap-2">
        {Array.from({ length: SHARED_SLOTS }).map((_, i) => {
          const byCrawl = i < crawl
          const bySearch = !byCrawl && i < crawl + searchRunning
          return <Slot key={i} label={byCrawl ? '크롤링' : bySearch ? '검색' : '유휴'} color={byCrawl ? AMBER : bySearch ? EMERALD : SLATE} filled={byCrawl || bySearch} long={byCrawl} />
        })}
      </div>

      {queued > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span className="text-gray-400">commonPool 대기</span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: Math.min(queued, 9) }).map((_, i) => (
              <Chip key={i} color={AMBER} muted />
            ))}
          </div>
          <span className="tabular-nums text-gray-400">크롤링 {queued}건 대기</span>
        </div>
      )}

      <div className="mt-4 border-t border-black/5 pt-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
          <Search className="h-3.5 w-3.5" /> 검색 · 메인페이지 요청
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: SEARCH_COUNT }).map((_, i) => {
            const running = i < searchRunning
            return (
              <div key={i} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${running ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-rose-200 bg-rose-50 text-rose-500'}`}>
                {running ? <Check className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {running ? '응답' : '정지(대기)'}
              </div>
            )
          })}
        </div>
        {meltdown && (
          <p className="mt-2 text-xs leading-relaxed text-rose-500">
            블로킹 크롤링(Selenium)이 5~30초씩 공유풀을 붙잡아 검색이 슬롯을 얻지 못합니다 — 같은 commonPool을 쓰는 모든 비동기 작업이 함께 멈춥니다.
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── ON: 다이어그램 기준 — 크롤링 논블로킹(FastAPI) + Bulkhead 4개 격리 풀 ───────
function OnView({
  req,
  imgRunning,
  imgQueued,
  imgRejected,
  overload,
  onOverload,
}: {
  req: number
  imgRunning: number
  imgQueued: number
  imgRejected: number
  overload: boolean
  onOverload: () => void
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
      {/* 크롤링 경로: WebClient 논블로킹 → FastAPI (다이어그램 상단) */}
      <div className="rounded-2xl border border-sky-200/70 bg-sky-50/40 p-4">
        <PoolHeader icon={<Globe className="h-4 w-4" />} title="일반 URL 카드 · 크롤링 경로" sub="WebClient 논블로킹 위임 → FastAPI 서버 (크롤링 + AI 분석)" tone="info" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: Math.min(req, 8) }).map((_, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }} className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-white px-1.5 py-1 text-[10px] text-sky-600">
                <Check className="h-3 w-3" />
              </motion.span>
            ))}
            {req > 8 && <span className="self-center text-[11px] text-sky-500">+{req - 8}</span>}
          </div>
          <ArrowRight className="h-4 w-4 text-sky-400" />
          <span className="rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-xs font-medium text-sky-700">FastAPI 서버 · 경량 크롤링(httpx·BeautifulSoup·GraphQL)</span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-sky-700/80">
          Selenium을 완전히 제거(100%→0%)하고 경량 API로 전환했습니다. moda-api는 스레드를 붙잡지 않고 HTTP만 대기하므로, 크롤링이 아무리 많이 와도 어떤 풀도 막지 않습니다.
        </p>
      </div>

      {/* Bulkhead 격리 풀 (다이어그램 Bulkhead 박스) */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 이미지 처리 풀 — 블로킹 I/O, 큐 초과 시 503 */}
        <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
          <PoolHeader icon={<Zap className="h-4 w-4" />} title="이미지 처리 풀" sub={`imageExecutor · max ${IMG_MAX} · queue ${IMG_QUEUE} · AbortPolicy`} tone="neutral" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: IMG_MAX }).map((_, i) => (
              <Slot key={i} label={i < imgRunning ? '이미지' : '유휴'} color={i < imgRunning ? AMBER : SLATE} filled={i < imgRunning} long={false} />
            ))}
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-gray-400">
              <span>큐</span>
              <span className="tabular-nums">
                {imgQueued} / {IMG_QUEUE}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <motion.div className="h-full rounded-full" style={{ background: AMBER }} animate={{ width: `${(imgQueued / IMG_QUEUE) * 100}%` }} transition={{ duration: 0.3 }} />
            </div>
          </div>
          <div className="mt-3 min-h-[30px]">
            <AnimatePresence>
              {imgRejected > 0 && (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: Math.min(imgRejected, 6) }).map((_, i) => (
                    <motion.span key={i} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: [0, -6, 0] }} transition={{ delay: i * 0.06, y: { repeat: Infinity, duration: 1.2 } }} className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-medium text-white">
                      <Bell className="h-3 w-3" /> 503
                    </motion.span>
                  ))}
                  <span className="text-[11px] text-rose-500">×{imgRejected} 즉시 거부 + FCM 재시도 안내</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={onOverload}
            className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${overload ? 'bg-rose-500 text-white' : 'border border-black/15 text-gray-600 hover:border-black'}`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {overload ? '폭주 해제' : `폭주 부하 (동시 ${BURST}건)`}
          </button>
        </div>

        {/* 검색 쿼리 풀 — 완전 격리, 항상 정상 */}
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-4 sm:p-5">
          <PoolHeader icon={<Search className="h-4 w-4" />} title="검색 쿼리 풀" sub={`executorService · fixed ${SEARCH_POOL} · PG·ES 병렬 쿼리`} tone="good" />
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: SEARCH_COUNT }).map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs text-emerald-600">
                <Check className="h-3.5 w-3.5" /> 응답 완료
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-emerald-700/80">
            크롤링·이미지 풀이 포화·폭주해도, 검색은 별도 fixed:10 풀이라 영향을 받지 않고 계속 응답합니다.
          </p>
        </div>
      </div>

      {/* 나머지 격리 풀 (다이어그램 하단) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniPool icon={<Database className="h-3.5 w-3.5" />} title="DB 저장 풀" sub="cardSaveExecutor · 분석 완료 후 DB 저장(수십 ms) → PostgreSQL" />
        <MiniPool icon={<Clock className="h-3.5 w-3.5" />} title="유튜브 폴링 풀" sub="youtubeExecutor · 15초 간격 주기적 폴링 → Lilys API" />
      </div>
    </motion.div>
  )
}

// ── 공통 조각 ────────────────────────────────────────────────────────────────
function PoolHeader({ icon, title, sub, tone }: { icon: ReactNode; title: string; sub: string; tone: 'neutral' | 'danger' | 'good' | 'info' }) {
  const toneCls = tone === 'danger' ? 'text-rose-500' : tone === 'good' ? 'text-emerald-600' : tone === 'info' ? 'text-sky-700' : 'text-gray-700'
  return (
    <div className="flex items-center gap-2">
      <span className={toneCls}>{icon}</span>
      <div>
        <p className={`text-sm font-medium ${toneCls}`}>{title}</p>
        <p className="text-[11px] text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

function MiniPool({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5">
      <span className="mt-0.5 text-gray-500">{icon}</span>
      <div>
        <p className="text-xs font-medium text-gray-700">{title}</p>
        <p className="text-[11px] leading-relaxed text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

function Slot({ label, color, filled, long }: { label: string; color: string; filled: boolean; long: boolean }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg border"
      style={{ borderColor: filled ? color : '#e5e7eb', background: filled ? `${color}1f` : '#fafafa' }}
    >
      {filled && (
        <motion.div
          className="absolute inset-x-1 bottom-1 h-1.5 rounded-full"
          style={{ background: color }}
          initial={{ width: '10%' }}
          animate={{ width: long ? ['10%', '95%'] : '95%' }}
          transition={long ? { duration: 3, repeat: Infinity, repeatType: 'reverse' } : { duration: 0.4 }}
        />
      )}
      <span className="text-[10px] font-medium" style={{ color: filled ? color : SLATE }}>
        {label}
      </span>
    </motion.div>
  )
}

function Chip({ color, muted }: { color: string; muted?: boolean }) {
  return <span className="h-3 w-3 rounded-sm" style={{ background: color, opacity: muted ? 0.4 : 1 }} />
}
