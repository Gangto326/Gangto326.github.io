import { useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Bell, Check, Clock, Database, Globe, Loader2, Search, Server, Zap } from 'lucide-react'
import { ExperienceShell } from '@/experiences/ExperienceShell'
import { scrollDemoIntoView } from '@/lib/scroll'

/**
 * MODA — 쓰레드풀 고갈 Bulkhead 시뮬레이터.
 *
 * docs/project4 "MODA API Request Handling" 다이어그램과 실제 소스(moda-api·moda-nlp) 기준.
 * 크롤링은 양쪽 모두 경량·논블로킹(WebClient → FastAPI)이라 스레드를 붙잡지 않는다. 유일한
 * 변수는 "블로킹 작업의 스레드풀 격리 여부" 하나다.
 *   OFF: 이미지 처리·DB 저장 등 블로킹 작업이 하나의 공유 풀(ForkJoinPool.commonPool, 2vCPU→
 *        3슬롯)을 함께 써서 슬롯을 점유 → 검색·유튜브 등 다른 작업이 슬롯을 얻지 못해 병목.
 *   ON:  작업마다 전용 격리 풀(이미지 처리·DB 저장·검색 쿼리·유튜브 폴링)로 분리 → 검색은
 *        전용 fixed:10 풀에서 항상 정상. 이미지 처리 풀 큐 초과 시 즉시 503+FCM(fail-fast).
 * 수치는 실측값. 외부 의존성 없는 프론트 시뮬레이션.
 */

type Mode = 'off' | 'on'

// 실측 상수
const SHARED_SLOTS = 3 // commonPool = vCPU-1 (t3.medium 2vCPU)
const IMG_MAX = 4 // 이미지 처리 풀 (imageExecutor) max
const IMG_QUEUE = 50 // 이미지 처리 풀 queue
const SEARCH_POOL = 10 // 검색 쿼리 풀 (executorService) fixed
const SEARCH_COUNT = 3 // 동시에 들어오는 검색/메인 요청(고정, 시각화용)
const BURST = 60 // "폭주" 시 동시 요청 (큐 초과 → 503)

const AMBER = '#f59e0b' // 이미지 처리
const VIOLET = '#8b5cf6' // DB 저장
const EMERALD = '#10b981' // 검색 쿼리
const SKY = '#0ea5e9' // 유튜브 폴링
const SLATE = '#94a3b8'

interface Metric {
  k: string
  off: string
  on: string
}
const METRICS: Metric[] = [
  { k: '검색 응답', off: '연쇄 정지', on: '정상 (무중단)' },
  { k: 'CPU 피크', off: '5.2%', on: '1.21% (−77%)' },
  { k: '부하 시 스레드 증가', off: '+25개', on: '+6개 (76%↓)' },
]

export function BulkheadDemo() {
  const [mode, setMode] = useState<Mode>('off')
  const [n, setN] = useState(1)
  const [overload, setOverload] = useState(false)

  const on = mode === 'on'
  const req = overload && on ? BURST : n

  // OFF: 블로킹 작업(이미지·DB 저장)이 공유 3슬롯 점유 → 검색·유튜브가 슬롯을 얻지 못함
  const blockRun = Math.min(n, SHARED_SLOTS)
  const youtubeRunOff = n < 2
  const searchRunOff = n < 3
  const meltdown = !on && !searchRunOff

  // ON: 이미지 처리 풀(max4 + queue50) — 큐 초과분은 503
  const imgRunning = Math.min(req, IMG_MAX)
  const imgQueued = Math.min(Math.max(0, req - IMG_MAX), IMG_QUEUE)
  const imgRejected = Math.max(0, req - IMG_MAX - IMG_QUEUE)

  const topRef = useRef<HTMLDivElement>(null)
  // 모드 전환으로 구조가 바뀌면 데모가 가장 잘 보이는 위치(담기면 중앙·아니면 상단)로 스크롤.
  // 폭주 토글은 이미지 처리 풀 카드 안에서의 조작이라 스크롤하지 않는다(시선 유지).
  const scrollTop = () => scrollDemoIntoView(topRef.current)

  const selectMode = (m: Mode) => {
    setMode(m)
    if (m === 'off') setOverload(false)
    scrollTop()
  }
  const toggleOverload = () => setOverload((v) => !v)

  return (
    <ExperienceShell
      title="쓰레드풀 고갈 Bulkhead 시뮬레이터"
      subtitle="이미지 처리·DB 저장·검색·유튜브 폴링이 한 서버에서 돕니다. Bulkhead를 켜고 꺼서, 블로킹 작업이 공유 풀을 점유해 검색까지 멈추는 문제와 풀을 격리해 서로 보호하는 개선을 비교하세요."
      hint={[
        "OFF·ON의 차이는 '블로킹 작업의 스레드풀 격리' 하나뿐 — 크롤링은 양쪽 모두 논블로킹(WebClient→FastAPI)이라 스레드를 붙잡지 않습니다.",
        'OFF: 블로킹 작업이 공유 풀(commonPool, 3슬롯)을 점유해 동시 3~4건이면 검색·메인페이지까지 연쇄 정지합니다.',
        'ON: 워크로드별 전용 풀로 격리 — 검색은 항상 정상 응답하고, 큐가 차면 무한 대기 대신 즉시 503+FCM으로 실패(fail-fast)합니다.',
        '수치는 실측값: CPU 피크 5.2%→1.21%, 부하 시 스레드 증가 +25개→+6개, 검색 무중단.',
      ]}
    >
      {/* 모드 토글 + 슬라이더 · 클릭 시 이 지점이 상단으로 */}
      <div ref={topRef} className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
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
                mode === m.k
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'border border-black/15 text-gray-600 hover:border-black dark:border-white/20 dark:text-gray-300 dark:hover:border-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 items-center gap-3 text-sm">
          <span className="shrink-0 text-gray-500 dark:text-gray-400">동시 요청</span>
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
          <span className="w-14 shrink-0 tabular-nums text-gray-700 dark:text-gray-200">{overload && on ? `${BURST}건` : `${n}건`}</span>
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
          className={`mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
            meltdown
              ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}
        >
          {meltdown ? (
            <>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>서버 먹통</strong> — 블로킹 작업이 공유 풀 3슬롯을 모두 점유해 검색·메인페이지까지 연쇄 정지했습니다.
              </span>
            </>
          ) : on ? (
            <>
              <Check className="h-4 w-4 shrink-0" />
              <span>
                <strong>정상</strong> — 작업마다 전용 격리 풀이라 검색은 fixed:10에서 독립 응답합니다
                {imgRejected > 0 ? `. 이미지 처리 풀 큐(50) 초과분 ${imgRejected}건은 즉시 503+FCM으로 실패(fail-fast).` : '.'}
              </span>
            </>
          ) : (
            <>
              <Check className="h-4 w-4 shrink-0" />
              <span>
                공유 풀에 여유가 있어 아직은 검색이 응답합니다. 동시 요청을 <strong>3건</strong> 이상으로 올려 보세요.
              </span>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 크롤링 경로 — 양쪽 모두 동일(경량·논블로킹). 병목과 무관한 상수 요소 */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-sky-200/60 bg-sky-50/40 px-3 py-2 text-xs text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
        <Globe className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>크롤링</strong>은 WebClient 논블로킹으로 FastAPI에 위임(경량 httpx·BeautifulSoup·GraphQL) — 스레드를 붙잡지 않아 <strong>OFF·ON 동일</strong>. 아래 스레드풀만 달라집니다.
        </span>
      </div>

      {/* 스레드풀 구조 (유일한 변수) */}
      <AnimatePresence mode="wait">
        {on ? (
          <OnView
            key="on-view"
            imgRunning={imgRunning}
            imgQueued={imgQueued}
            imgRejected={imgRejected}
            overload={overload}
            onOverload={toggleOverload}
          />
        ) : (
          <OffView key="off-view" blockRun={blockRun} n={n} searchRun={searchRunOff} youtubeRun={youtubeRunOff} />
        )}
      </AnimatePresence>

      {/* 실측 지표 비교 */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        <div className="grid grid-cols-3 border-b border-black/10 bg-gray-50 px-4 py-2 text-[11px] tracking-widest text-gray-400 dark:border-white/10 dark:bg-white/5">
          <span>지표</span>
          <span className="text-center">OFF · 공유풀</span>
          <span className="text-center">ON · 격리풀</span>
        </div>
        {METRICS.map((m) => (
          <div key={m.k} className="grid grid-cols-3 items-center px-4 py-2.5 text-sm odd:bg-white even:bg-gray-50/50 dark:odd:bg-transparent dark:even:bg-white/5">
            <span className="text-gray-600 dark:text-gray-300">{m.k}</span>
            <span className={`text-center tabular-nums ${!on ? 'font-medium text-rose-500 dark:text-rose-400' : 'text-gray-400'}`}>{m.off}</span>
            <span className={`text-center tabular-nums ${on ? 'font-medium text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>{m.on}</span>
          </div>
        ))}
      </div>
    </ExperienceShell>
  )
}

// ── OFF: 하나의 공유 풀을 모든 블로킹 작업이 공유 → 검색 정지 ──────────────────
function OffView({ blockRun, n, searchRun, youtubeRun }: { blockRun: number; n: number; searchRun: boolean; youtubeRun: boolean }) {
  const meltdown = !searchRun
  // 3슬롯을 채우는 블로킹 작업(이미지 처리 / DB 저장 번갈아)
  const slotFill = Array.from({ length: SHARED_SLOTS }).map((_, i) => {
    if (i >= blockRun) return null
    return i % 2 === 0 ? { label: '이미지', color: AMBER } : { label: 'DB 저장', color: VIOLET }
  })
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
      <PoolHeader icon={<Server className="h-4 w-4" />} title="공유 스레드풀 · ForkJoinPool.commonPool()" sub={`${SHARED_SLOTS}슬롯 (vCPU−1) · 모든 블로킹 작업이 함께 사용`} tone={meltdown ? 'danger' : 'neutral'} />
      <div className="mt-3 flex flex-wrap gap-2">
        {slotFill.map((s, i) => (
          <Slot key={i} label={s ? s.label : '유휴'} color={s ? s.color : SLATE} filled={!!s} long={!!s} />
        ))}
      </div>
      {n > SHARED_SLOTS && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-gray-400">대기</span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: Math.min(n - SHARED_SLOTS, 9) }).map((_, i) => (
              <Chip key={i} color={AMBER} muted />
            ))}
          </div>
          <span className="tabular-nums text-gray-400">블로킹 작업 {n - SHARED_SLOTS}건 대기</span>
        </div>
      )}

      {/* 슬롯을 얻지 못한 다른 작업들 */}
      <div className="mt-4 border-t border-black/5 pt-4 dark:border-white/10">
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">같은 공유 풀을 기다리는 다른 작업</p>
        <div className="flex flex-wrap gap-2">
          <WorkChip icon={<Search className="h-3.5 w-3.5" />} label="검색 쿼리" running={searchRun} />
          <WorkChip icon={<Clock className="h-3.5 w-3.5" />} label="유튜브 폴링" running={youtubeRun} />
        </div>
        {meltdown && (
          <p className="mt-2 text-xs leading-relaxed text-rose-500 dark:text-rose-400">
            이미지 처리·DB 저장 같은 블로킹 작업이 3슬롯을 오래 붙잡아, 같은 commonPool을 쓰는 검색·메인페이지가 슬롯을 얻지 못하고 함께 멈춥니다.
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── ON: 작업마다 전용 격리 풀 (다이어그램 Bulkhead 박스) ───────────────────────
function OnView({
  imgRunning,
  imgQueued,
  imgRejected,
  overload,
  onOverload,
}: {
  imgRunning: number
  imgQueued: number
  imgRejected: number
  overload: boolean
  onOverload: () => void
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4 md:grid-cols-2">
      {/* 이미지 처리 풀 — 블로킹 I/O, 큐 초과 시 503 */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <PoolHeader icon={<Zap className="h-4 w-4" />} title="이미지 처리 풀" sub={`imageExecutor · max ${IMG_MAX} · queue ${IMG_QUEUE} · AbortPolicy`} tone="neutral" accent={AMBER} />
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
          <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
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
                <span className="text-[11px] text-rose-500 dark:text-rose-400">×{imgRejected} 즉시 거부 + FCM 재시도 안내</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onOverload}
          className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors ${overload ? 'bg-rose-500 text-white' : 'border border-black/15 text-gray-600 hover:border-black dark:border-white/20 dark:text-gray-300 dark:hover:border-white'}`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {overload ? '폭주 해제' : `폭주 부하 (동시 ${BURST}건)`}
        </button>
      </div>

      {/* 검색 쿼리 풀 — 완전 격리, 항상 정상 */}
      <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 sm:p-5">
        <PoolHeader icon={<Search className="h-4 w-4" />} title="검색 쿼리 풀" sub={`executorService · fixed ${SEARCH_POOL} · PG·ES 병렬 쿼리`} tone="good" />
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: SEARCH_COUNT }).map((_, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-3.5 w-3.5" /> 응답 완료
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-emerald-700/80 dark:text-emerald-300/80">
          이미지 처리 풀이 포화·폭주해도, 검색은 별도 fixed:10 풀이라 영향을 받지 않고 계속 응답합니다.
        </p>
      </div>

      {/* DB 저장 풀 */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <PoolHeader icon={<Database className="h-4 w-4" />} title="DB 저장 풀" sub="cardSaveExecutor · 분석 완료 후 저장(수십 ms) → PostgreSQL" tone="neutral" accent={VIOLET} />
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Slot key={i} label="DB 저장" color={VIOLET} filled long={false} />
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Netty 이벤트 루프에서 DB 저장을 떼어내(thenApplyAsync) 전용 풀에서 실행 → 이벤트 루프 블로킹 방지.
        </p>
      </div>

      {/* 유튜브 폴링 풀 */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <PoolHeader icon={<Clock className="h-4 w-4" />} title="유튜브 폴링 풀" sub="youtubeExecutor · 15초 간격 주기적 폴링 → Lilys API" tone="neutral" accent={SKY} />
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Slot key={i} label="폴링" color={SKY} filled long={false} />
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          장시간 폴링이 다른 풀을 점유하지 않도록 core:2로 격리 → 카드 생성·검색과 무관하게 동작.
        </p>
      </div>
    </motion.div>
  )
}

// ── 공통 조각 ────────────────────────────────────────────────────────────────
function PoolHeader({ icon, title, sub, tone, accent }: { icon: ReactNode; title: string; sub: string; tone: 'neutral' | 'danger' | 'good'; accent?: string }) {
  const toneCls =
    tone === 'danger'
      ? 'text-rose-500 dark:text-rose-400'
      : tone === 'good'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-gray-700 dark:text-gray-200'
  return (
    <div className="flex items-center gap-2">
      <span className={toneCls} style={accent && tone === 'neutral' ? { color: accent } : undefined}>
        {icon}
      </span>
      <div>
        <p className={`text-sm font-medium ${toneCls}`}>{title}</p>
        <p className="text-[11px] text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

function WorkChip({ icon, label, running }: { icon: ReactNode; label: string; running: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${running ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'}`}>
      {icon}
      {label}
      <span className="text-gray-300 dark:text-gray-600">·</span>
      {running ? <Check className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {running ? '응답' : '정지(대기)'}
    </div>
  )
}

function Slot({ label, color, filled, long }: { label: string; color: string; filled: boolean; long: boolean }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative flex h-12 w-16 items-center justify-center overflow-hidden rounded-lg border ${
        filled ? '' : 'border-gray-200 bg-neutral-50 dark:border-white/15 dark:bg-white/5'
      }`}
      style={filled ? { borderColor: color, background: `${color}1f` } : undefined}
    >
      {filled && (
        // long(오래 붙잡는 블로킹 작업)은 느린 풀 스윕, 짧은 작업도 계속 핑퐁해 '가동 중'이 보이게
        <motion.div
          className="absolute inset-x-1 bottom-1 h-1.5 rounded-full"
          style={{ background: color }}
          initial={{ width: '10%' }}
          animate={{ width: long ? ['10%', '95%'] : ['40%', '95%'] }}
          transition={{ duration: long ? 3 : 1.4, repeat: Infinity, repeatType: 'reverse' }}
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
