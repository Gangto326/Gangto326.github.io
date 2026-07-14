import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, Network, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { ExperienceShell } from '@/experiences/ExperienceShell'

type Mode = 'lazy' | 'eager'
type View = 'demo' | 'diagram'

interface Lane {
  key: string
  label: string
  sub: string
  start: number
  end: number
  color: string
  extra?: boolean
}

const VID = `${import.meta.env.BASE_URL}assets/ojo/bus-demo.mp4`
const SEQ = `${import.meta.env.BASE_URL}assets/ojo/sequence.webp`
const BUS_NO = '360'

// 영상 시간 = 타임라인 시간 (1:1). 영상 속 제스처 3.1s.
const GESTURE = 3.1
const GAP = 0.2 // 제스처 인식 → 처리 시작 지연(현실성). 제스처 선에서 살짝 띄운다.
const PROC_START = GESTURE + GAP // 3.3
const ANNOUNCE_LAG = 0.1 // 재생 시작 → 음성이 실제로 들리기까지
const BUS_DEPART = 8.8 // Lazy에서만 표시 — 영상 종료(≈6.84s) 약 2초 뒤 버스가 출발
// 타임라인 스케일: Eager는 짧게, Lazy는 긴 파이프라인(≈11s)이 다 보이도록 넓게
const SCALE_E = 4.5
const SCALE_L = 11.5

// Eager: 제스처(3.1s) 이전 선제 처리 완료 → 대기 → 즉시 재생. GPS·캐싱·교차검증은 Eager 전용.
const EAGER: Lane[] = [
  { key: 'gps', label: 'GPS·정류장 확인', sub: '15초 체류 감지', start: 0.1, end: 0.4, color: '#6366f1', extra: true },
  { key: 'cache', label: '노선 캐싱', sub: 'API → Redis Set', start: 0.4, end: 0.9, color: '#0ea5e9', extra: true },
  { key: 'yolo', label: 'YOLO 버스 탐지', sub: '160° 광각 포착', start: 0.9, end: 1.3, color: '#8b5cf6' },
  { key: 'ocr', label: 'OCR 번호 인식', sub: `번호판 → "${BUS_NO}"`, start: 1.3, end: 1.9, color: '#f59e0b' },
  { key: 'verify', label: '노선 교차검증', sub: 'Redis SISMEMBER', start: 1.9, end: 2.1, color: '#14b8a6', extra: true },
  { key: 'tts', label: 'TTS 음성 준비', sub: '미리 생성 · 저장', start: 2.1, end: 2.4, color: '#10b981' },
  { key: 'wait', label: '안내 대기', sub: '준비 완료 · 제스처 대기', start: 2.4, end: GESTURE, color: '#cbd5e1' },
  { key: 'play', label: '음성 안내 재생', sub: '캐싱 파일 즉시 재생', start: PROC_START, end: 4.0, color: '#059669' },
]

// Lazy(기존): GPS·캐싱·교차검증 없음. 제스처 이후 YOLO→OCR→TTS 생성→재생을 순차 실행.
// 실제 CV·TTS를 그때서야 수행하므로 사용자 체감 지연이 7초를 넘는다.
const LAZY: Lane[] = [
  { key: 'yolo', label: 'YOLO 버스 탐지', sub: '제스처 후 시작', start: PROC_START, end: 4.2, color: '#8b5cf6' },
  { key: 'ocr', label: 'OCR 번호 인식', sub: `번호판 → "${BUS_NO}"`, start: 4.2, end: 6.4, color: '#f59e0b' },
  { key: 'tts', label: 'TTS 음성 생성', sub: '안내 합성 (지연)', start: 6.4, end: 10.4, color: '#10b981' },
  { key: 'play', label: '음성 안내 재생', sub: '생성 완료 후 재생', start: 10.4, end: 11.0, color: '#059669' },
]

const ROW = 34

export function BusEagerDemo() {
  const [mode, setMode] = useState<Mode>('lazy')
  const [view, setView] = useState<View>('demo')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(6.84)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const scale = mode === 'eager' ? SCALE_E : SCALE_L
  const x = (s: number) => Math.max(0, Math.min(100, (s / scale) * 100))

  const lanes = mode === 'eager' ? EAGER : LAZY
  const ttsLane = lanes.find((l) => l.key === 'tts')!
  const ttsReadyAt = ttsLane.end
  const playLane = lanes.find((l) => l.key === 'play')!
  const deliverAt = playLane.start + ANNOUNCE_LAG // 사용자가 음성 안내를 듣는 시점
  const caught = deliverAt <= BUS_DEPART
  const lead = GESTURE - ttsReadyAt
  const yoloEnd = lanes.find((l) => l.key === 'yolo')!.end
  const detected = t >= yoloEnd
  const delivered = t >= deliverAt

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      if (v.currentTime >= v.duration - 0.05) v.currentTime = 0
      void v.play()
      scrollTop()
    } else {
      v.pause()
    }
  }
  const scrub = (val: number) => {
    const v = videoRef.current
    if (v) {
      v.pause()
      v.currentTime = val
    }
    setT(val)
  }
  const toggleMute = () => {
    const v = videoRef.current
    if (v) {
      v.muted = !v.muted
      setMuted(v.muted)
    }
  }
  const selectMode = (m: Mode) => {
    setMode(m)
    setView('demo')
    scrollTop()
  }
  const toggleView = () => {
    setView((v) => (v === 'demo' ? 'diagram' : 'demo'))
    scrollTop()
  }

  return (
    <ExperienceShell
      title="버스 번호 인식 — Eager Evaluation"
      subtitle="실제 시연 영상을 재생하거나 스크럽하며, 각 처리가 어느 순간 트리거되어 준비되는지 확인해 보세요."
      hint={[
        '영상과 타임라인은 1:1 동기화 — 영상 속 제스처(3.1s)가 아래 플로우의 제스처 시점입니다.',
        "Lazy는 '선제 처리가 없었다면'의 비교 — 제스처 후에야 YOLO→OCR→TTS를 순차 실행합니다.",
        '처리 소요 시간은 개념 이해를 위한 예시값입니다.',
      ]}
    >
      {/* 모드 선택 + 뷰 전환 · 재생/버튼 클릭 시 이 지점이 상단으로 */}
      <div ref={topRef} style={{ scrollMarginTop: 80 }} className="mb-5 flex flex-wrap items-center gap-2">
        {(
          [
            { k: 'lazy', label: 'Lazy 방식 (기존)' },
            { k: 'eager', label: 'Eager 선제 처리' },
          ] as { k: Mode; label: string }[]
        ).map((m) => (
          <button
            key={m.k}
            onClick={() => selectMode(m.k)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              mode === m.k && view === 'demo'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'border border-black/15 text-gray-600 hover:border-black dark:border-white/20 dark:text-gray-300 dark:hover:border-white'
            }`}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={toggleView}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${
            view === 'diagram'
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'border border-black/15 text-gray-600 hover:border-black hover:text-black dark:border-white/20 dark:text-gray-300 dark:hover:border-white dark:hover:text-white'
          }`}
        >
          <Network className="h-4 w-4" />
          시퀀스 다이어그램
        </button>
      </div>

      {view === 'diagram' ? (
        // 다이어그램 PNG는 라이트 튜닝 — 다크에서도 흰 서피스 유지
        <div className="rounded-2xl border border-black/10 bg-white p-3 dark:border-white/10 sm:p-4">
          <img
            src={SEQ}
            alt="버스 번호 인식 Pre-fetching 시퀀스 다이어그램"
            className="block h-auto w-full"
          />
        </div>
      ) : (
        <>
          {/* 카메라 뷰 — 실제 시연 영상 (하단 손 제스처 우선 크롭) */}
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              src={VID}
              muted={muted}
              playsInline
              preload="metadata"
              className="h-[240px] w-full object-cover object-bottom sm:h-[300px]"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 6.84)}
              onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                실제 시연 · 160° 광각 YOLO
              </span>
              {detected && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-violet-500/90 px-2.5 py-1 text-[11px] font-medium text-white"
                >
                  버스 {BUS_NO} 탐지
                </motion.span>
              )}
            </div>
            {t >= GESTURE && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur"
              >
                ✊ 제스처
              </motion.span>
            )}
            {mode === 'eager' && t >= deliverAt && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-medium text-white"
              >
                🔊 음성 알림
              </motion.span>
            )}
            <button
              onClick={toggleMute}
              aria-label={muted ? '소리 켜기' : '소리 끄기'}
              className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2 text-white backdrop-blur transition-colors hover:bg-black/80"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>

          {/* 컨트롤 */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playing ? '일시정지' : '재생'}
            </button>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.02}
              value={t}
              onChange={(e) => scrub(Number(e.target.value))}
              className="flex-1 accent-black"
              aria-label="타임라인 스크럽"
            />
          </div>

          {/* 간트 타임라인 */}
          <div className="mt-5 overflow-x-auto">
            <div className="flex min-w-[520px]">
              <div className="w-36 shrink-0">
                {lanes.map((l) => (
                  <div key={l.key} style={{ height: ROW }} className="flex flex-col justify-center overflow-hidden pr-3 text-right">
                    <span className="truncate text-xs text-gray-700 dark:text-gray-200">
                      {l.label}
                      {l.extra && <span className="ml-1 align-middle text-[9px] text-sky-500 dark:text-sky-400">+Eager</span>}
                    </span>
                    <span className="truncate text-[10px] text-gray-400">{l.sub}</span>
                  </div>
                ))}
              </div>

              <div className="relative flex-1" style={{ height: lanes.length * ROW }}>
                {lanes.map((l, i) => {
                  const left = x(l.start)
                  const right = x(l.end)
                  const fillRight = x(Math.min(t, l.end))
                  const ongoing = l.end > scale
                  const done = t >= l.end && !ongoing
                  const active = t >= l.start && t < l.end
                  return (
                    <div key={l.key} className="absolute inset-x-0" style={{ top: i * ROW, height: ROW }}>
                      <div className="relative top-1/2 h-6 -translate-y-1/2">
                        <div
                          className="absolute h-full rounded-md opacity-20 dark:opacity-30"
                          style={{ left: `${left}%`, width: `${right - left}%`, background: l.color }}
                        />
                        <div
                          className={`absolute flex h-full items-center justify-end rounded-md pr-1.5 ${active && ongoing ? 'animate-pulse' : ''}`}
                          style={{ left: `${left}%`, width: `${Math.max(0, fillRight - left)}%`, background: l.color }}
                        >
                          {done && <Check className="h-3 w-3 text-white" />}
                        </div>
                        {ongoing && active && (
                          <span className="absolute right-0 top-1/2 -translate-y-1/2 pr-0.5 text-[10px] font-bold text-gray-400">
                            ⋯
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* 제스처 마커 */}
                <div className="absolute inset-y-0 z-20" style={{ left: `${x(GESTURE)}%` }}>
                  <div className="h-full border-l-2 border-black dark:border-white" />
                  <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-[10px] text-white dark:bg-white dark:text-black">
                    ✊ 제스처
                  </span>
                </div>

                {/* 버스 출발 마커 — Lazy에서만 */}
                {mode === 'lazy' && (
                  <div className="absolute inset-y-0 z-20" style={{ left: `${x(BUS_DEPART)}%` }}>
                    <div className="h-full border-l-2 border-dashed border-rose-400" />
                    <span className="absolute bottom-0 left-1 whitespace-nowrap rounded bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                      🚌 버스 출발
                    </span>
                  </div>
                )}

                {/* 재생 헤드 */}
                <div className="absolute inset-y-0 z-30 w-px bg-black/70 dark:bg-white/70" style={{ left: `${x(t)}%` }}>
                  <div className="absolute -top-1 -left-[3px] h-2 w-2 rounded-full bg-black dark:bg-white" />
                </div>
              </div>
            </div>
          </div>

          {/* 준비/대기 비교 + 결과 (한 카드) */}
          <div className="mt-5 rounded-xl border border-black/10 p-4 dark:border-white/10">
            <div className="flex flex-wrap gap-x-10 gap-y-2">
              <div>
                <span className="text-xs tracking-widest text-gray-400">TTS 준비</span>
                <p className={`text-lg font-light tabular-nums ${lead >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {Math.abs(lead).toFixed(1)}s
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {lead >= 0 ? '제스처 전 준비 완료' : '제스처 후에도 생성 중'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs tracking-widest text-gray-400">안내까지 대기(체감)</span>
                <p className={`text-lg font-light tabular-nums ${caught ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {(deliverAt - GESTURE).toFixed(1)}s
                  <span className="ml-2 text-xs font-normal text-gray-400">제스처 → 안내 청취</span>
                </p>
              </div>
            </div>

            <div className="mt-3 border-t border-black/5 pt-3 text-sm dark:border-white/10">
              {t < GESTURE ? (
                <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  {mode === 'eager' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> 이벤트 트리거로 선제 처리 중 — 제스처 전에 결과를 준비합니다.
                    </>
                  ) : (
                    '제스처 전 — Lazy는 아직 아무 처리도 시작하지 않습니다.'
                  )}
                </p>
              ) : delivered && caught ? (
                <p className="text-emerald-600 dark:text-emerald-400">🔊 {BUS_NO}번 버스입니다 — 제스처 즉시 음성 안내, 탑승 성공</p>
              ) : mode === 'lazy' && t >= duration - 0.1 ? (
                // 버스 출발(8.8s)은 영상 종료 뒤 — 영상이 끝나면 임박 경고로 전환
                <p className="text-rose-500 dark:text-rose-400">
                  🚌 약 2초 뒤 버스 출발 — 아직 TTS 생성 중이라 안내가 도착하지 못합니다
                </p>
              ) : (
                <p className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> 제스처 이후 처리 중…
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </ExperienceShell>
  )
}
