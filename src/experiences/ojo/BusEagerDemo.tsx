import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Hand, Loader2, Pause, Play } from 'lucide-react'
import { ExperienceShell } from '@/experiences/ExperienceShell'

type Mode = 'eager' | 'lazy'

interface Lane {
  key: string
  label: string
  sub: string
  start: number
  end: number
  color: string
}

const TOTAL = 9 // 시나리오 총 길이(초)
const BUS_NO = '360'
const GESTURE = 4.5 // 사용자 제스처 시점
const BUS_DEPART = 6.5 // 버스가 출발하는 시점
const ROW = 38 // 레인 행 높이(px)
const CAM = (i: number) => `${import.meta.env.BASE_URL}assets/ojo/cam-${i}.jpg`
const x = (s: number) => (s / TOTAL) * 100

// Eager: 각 처리가 실제 이벤트(GPS 확인 / 버스 탐지)에 트리거되어 시차를 두고 미리 준비된다
const EAGER: Lane[] = [
  { key: 'gps', label: 'GPS·정류장 확인', sub: 'GeoHash Lv7 · O(1)', start: 0.0, end: 0.4, color: '#6366f1' },
  { key: 'cache', label: '노선 캐싱', sub: '공공데이터 API → Redis Set', start: 0.4, end: 1.3, color: '#0ea5e9' },
  { key: 'yolo', label: 'YOLO 버스 탐지', sub: '160° 광각 측면 포착', start: 1.2, end: 1.6, color: '#8b5cf6' },
  { key: 'ocr', label: 'OCR 번호 인식', sub: `CLOVA OCR → "${BUS_NO}"`, start: 1.6, end: 2.8, color: '#f59e0b' },
  { key: 'verify', label: '노선 교차검증', sub: 'Redis SISMEMBER', start: 2.8, end: 3.0, color: '#14b8a6' },
  { key: 'tts', label: 'TTS 음성 준비', sub: '안내 합성 → 대기', start: 3.0, end: 3.5, color: '#10b981' },
]

// Lazy: 제스처 이전엔 아무것도 하지 않고, 제스처 순간부터 모든 처리를 순차 실행한다
const DUR = [0.4, 0.9, 0.4, 1.2, 0.2, 0.5]
const LAZY: Lane[] = (() => {
  let acc = GESTURE
  return EAGER.map((l, i) => {
    const start = acc
    acc += DUR[i]
    return { ...l, start, end: acc }
  })
})()

function useTicker(playing: boolean, setT: (fn: (t: number) => number) => void, onEnd: () => void) {
  const ref = useRef<number | null>(null)
  useEffect(() => {
    if (!playing) return
    ref.current = window.setInterval(() => {
      setT((t) => {
        const nt = t + 0.06
        if (nt >= TOTAL) {
          onEnd()
          return TOTAL
        }
        return nt
      })
    }, 40)
    return () => {
      if (ref.current !== null) clearInterval(ref.current)
    }
  }, [playing, setT, onEnd])
}

export function BusEagerDemo() {
  const [mode, setMode] = useState<Mode>('eager')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)

  useTicker(playing, setT, () => setPlaying(false))

  const lanes = mode === 'eager' ? EAGER : LAZY
  const ttsReadyAt = lanes[lanes.length - 1].end
  const deliverAt = Math.max(GESTURE, ttsReadyAt)
  const caught = deliverAt <= BUS_DEPART
  const yoloEnd = lanes[2].end
  const detected = t >= yoloEnd
  const ttsReady = t >= ttsReadyAt
  const delivered = t >= deliverAt
  const camIdx = t < TOTAL / 3 ? 0 : t < (2 * TOTAL) / 3 ? 1 : 2

  const reset = () => {
    setPlaying(false)
    setT(0)
  }
  const switchMode = (m: Mode) => {
    setPlaying(false)
    setT(0)
    setMode(m)
  }
  const togglePlay = () => {
    if (t >= TOTAL) setT(0)
    setPlaying((p) => !p)
  }

  return (
    <ExperienceShell
      title="버스 번호 인식 — Eager Evaluation"
      subtitle="각 처리가 어떤 이벤트에 트리거되어 언제 준비되는지, 타임라인을 재생하거나 직접 스크럽해 보세요."
      hint="카메라 프레임은 실제 시연 영상에서 추출했습니다. 시간 축의 처리 소요는 개념 이해를 위한 예시값이며, 핵심은 '각 처리가 시작되는 트리거 순간'입니다. Eager는 GPS 확인·버스 탐지 시점에 미리 처리를 끝내 두고, Lazy는 제스처 이후에야 시작합니다."
      onReset={reset}
    >
      {/* 모드 선택 */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            { k: 'eager', label: 'Eager 선제 처리' },
            { k: 'lazy', label: 'Lazy 방식 (기존)' },
          ] as { k: Mode; label: string }[]
        ).map((m) => (
          <button
            key={m.k}
            onClick={() => switchMode(m.k)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              mode === m.k ? 'bg-black text-white' : 'border border-black/15 text-gray-600 hover:border-black'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 카메라 뷰 */}
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <img src={CAM(camIdx)} alt="160도 광각 카메라 · YOLO 버스 탐지" className="w-full object-cover" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            160° 광각 · YOLO
          </span>
          {detected && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full bg-violet-500/90 px-2.5 py-1 text-[11px] font-medium text-white"
            >
              버스 {BUS_NO} 탐지됨
            </motion.span>
          )}
        </div>
        {ttsReady && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-medium text-white"
          >
            🔊 안내 준비 완료
          </motion.span>
        )}
      </div>

      {/* 컨트롤 */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm text-white"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? '일시정지' : t >= TOTAL ? '다시재생' : '재생'}
        </button>
        <input
          type="range"
          min={0}
          max={TOTAL}
          step={0.05}
          value={t}
          onChange={(e) => {
            setPlaying(false)
            setT(Number(e.target.value))
          }}
          className="flex-1 accent-black"
          aria-label="타임라인 스크럽"
        />
        <span className="w-12 shrink-0 text-right text-sm tabular-nums text-gray-500">
          {t.toFixed(1)}s
        </span>
      </div>

      {/* 간트 타임라인 */}
      <div className="mt-5 overflow-x-auto">
        <div className="flex min-w-[520px]">
          {/* 레인 라벨 */}
          <div className="w-28 shrink-0">
            {lanes.map((l) => (
              <div key={l.key} style={{ height: ROW }} className="flex flex-col justify-center pr-3 text-right">
                <span className="text-xs text-gray-700">{l.label}</span>
                <span className="text-[10px] text-gray-400">{l.sub}</span>
              </div>
            ))}
          </div>

          {/* 타임라인 좌표계 */}
          <div className="relative flex-1" style={{ height: lanes.length * ROW }}>
            {/* 레인 바 */}
            {lanes.map((l, i) => {
              const frac = Math.max(0, Math.min(1, (t - l.start) / (l.end - l.start)))
              const done = t >= l.end
              const barW = x(l.end) - x(l.start)
              return (
                <div key={l.key} className="absolute inset-x-0" style={{ top: i * ROW, height: ROW }}>
                  <div className="relative top-1/2 h-6 -translate-y-1/2">
                    {/* 예약(scheduled) */}
                    <div
                      className="absolute h-full rounded-md opacity-20"
                      style={{ left: `${x(l.start)}%`, width: `${barW}%`, background: l.color }}
                    />
                    {/* 진행(progress) */}
                    <div
                      className="absolute flex h-full items-center justify-end rounded-md pr-1.5"
                      style={{ left: `${x(l.start)}%`, width: `${barW * frac}%`, background: l.color }}
                    >
                      {done && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* 제스처 마커 */}
            <div className="absolute inset-y-0 z-20" style={{ left: `${x(GESTURE)}%` }}>
              <div className="h-full border-l-2 border-black" />
              <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-[10px] text-white">
                ✊ 제스처
              </span>
            </div>

            {/* 버스 출발 마커 */}
            <div className="absolute inset-y-0 z-20" style={{ left: `${x(BUS_DEPART)}%` }}>
              <div className="h-full border-l-2 border-dashed border-rose-400" />
              <span className="absolute bottom-0 left-1 whitespace-nowrap rounded bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                🚌 버스 출발
              </span>
            </div>

            {/* 재생 헤드 */}
            <div
              className="absolute inset-y-0 z-30 w-px bg-black/70"
              style={{ left: `${x(t)}%` }}
            >
              <div className="absolute -top-1 -left-[3px] h-2 w-2 rounded-full bg-black" />
            </div>
          </div>
        </div>
      </div>

      {/* 준비 시점 비교 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs tracking-widest text-gray-400">TTS 준비 완료</p>
          <p className="mt-1 text-2xl font-light tabular-nums">
            {ttsReadyAt.toFixed(1)}
            <span className="ml-1 text-sm text-gray-400">s</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {mode === 'eager'
              ? '제스처(4.5s) 이전에 이미 준비 완료'
              : '제스처(4.5s) 이후에야 처리 시작'}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs tracking-widest text-gray-400">안내까지 대기</p>
          <p className={`mt-1 text-2xl font-light tabular-nums ${caught ? 'text-emerald-600' : 'text-rose-500'}`}>
            {(deliverAt - GESTURE).toFixed(1)}
            <span className="ml-1 text-sm text-gray-400">s</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">제스처 후 안내까지 걸린 시간</p>
        </div>
      </div>

      {/* 결과 */}
      <div className="mt-3 rounded-xl border border-black/10 p-4 text-sm">
        {t < GESTURE ? (
          <p className="flex items-center gap-2 text-gray-500">
            {mode === 'eager' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                이벤트 트리거로 선제 처리 중 — 제스처를 기다리며 결과를 준비합니다.
              </>
            ) : (
              <>
                <Hand className="h-4 w-4" />
                제스처 전 — 아직 아무 처리도 시작하지 않았습니다.
              </>
            )}
          </p>
        ) : delivered ? (
          <div>
            <p className="text-base font-medium text-gray-900">🔊 {BUS_NO}번 버스입니다</p>
            <p className={`mt-1 ${caught ? 'text-emerald-600' : 'text-rose-500'}`}>
              {caught
                ? '🚌 버스가 떠나기 전에 안내 완료 — 탑승 성공'
                : '🚌 안내가 늦어 버스가 이미 출발했습니다'}
            </p>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            제스처 이후 처리 중… ({(t - GESTURE).toFixed(1)}s 경과)
          </p>
        )}
      </div>
    </ExperienceShell>
  )
}
