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
const SEQ = `${import.meta.env.BASE_URL}assets/ojo/sequence.png`
const BUS_NO = '360'

// 영상 시간 = 타임라인 시간 (1:1). 영상 속 제스처 3.1s.
const GESTURE = 3.1
const ANNOUNCE = 3.4 // 음성 안내가 들리기 시작(재생 조금 지난 시점)
const SCALE = 4.5 // 타임라인 오른쪽 끝
const BUS_DEPART = 4.5 // Lazy에서만 표시
const ROW = 34
const clampX = (s: number) => Math.max(0, Math.min(100, (s / SCALE) * 100))

// Eager: 제스처(3.1s) 이전 선제 처리 완료 → 대기 → 즉시 재생. GPS·캐싱·교차검증은 Eager 전용.
const EAGER: Lane[] = [
  { key: 'gps', label: 'GPS·정류장 확인', sub: '15초 체류 감지', start: 0.1, end: 0.4, color: '#6366f1', extra: true },
  { key: 'cache', label: '노선 캐싱', sub: 'API → Redis Set', start: 0.4, end: 0.9, color: '#0ea5e9', extra: true },
  { key: 'yolo', label: 'YOLO 버스 탐지', sub: '160° 광각 포착', start: 0.9, end: 1.3, color: '#8b5cf6' },
  { key: 'ocr', label: 'OCR 번호 인식', sub: `번호판 → "${BUS_NO}"`, start: 1.3, end: 1.9, color: '#f59e0b' },
  { key: 'verify', label: '노선 교차검증', sub: 'Redis SISMEMBER', start: 1.9, end: 2.1, color: '#14b8a6', extra: true },
  { key: 'tts', label: 'TTS 음성 준비', sub: '미리 생성 · 저장', start: 2.1, end: 2.4, color: '#10b981' },
  { key: 'wait', label: '안내 대기', sub: '준비 완료 · 제스처 대기', start: 2.4, end: GESTURE, color: '#cbd5e1' },
  { key: 'play', label: '음성 안내 재생', sub: '캐싱 파일 즉시 재생', start: GESTURE, end: 4.0, color: '#059669' },
]

// Lazy(기존): GPS·캐싱·교차검증 없음. 제스처 이후 YOLO→OCR→TTS만 순차 실행.
const LAZY: Lane[] = [
  { key: 'yolo', label: 'YOLO 버스 탐지', sub: '제스처 후 시작', start: GESTURE, end: 3.5, color: '#8b5cf6' },
  { key: 'ocr', label: 'OCR 번호 인식', sub: `번호판 → "${BUS_NO}"`, start: 3.5, end: 4.1, color: '#f59e0b' },
  { key: 'tts', label: 'TTS 음성 생성', sub: '안내 합성 (지연)', start: 4.1, end: 5.3, color: '#10b981' },
]

export function BusEagerDemo() {
  const [mode, setMode] = useState<Mode>('lazy')
  const [view, setView] = useState<View>('demo')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(6.84)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const lanes = mode === 'eager' ? EAGER : LAZY
  const ttsLane = lanes.find((l) => l.key === 'tts')!
  const ttsReadyAt = ttsLane.end
  const deliverAt = mode === 'eager' ? ANNOUNCE : ttsReadyAt
  const caught = deliverAt <= BUS_DEPART
  const lead = GESTURE - ttsReadyAt
  const yoloEnd = lanes.find((l) => l.key === 'yolo')!.end
  const detected = t >= yoloEnd
  const delivered = t >= deliverAt

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      if (v.currentTime >= v.duration - 0.05) v.currentTime = 0
      void v.play()
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  const reset = () => {
    const v = videoRef.current
    if (v) {
      v.pause()
      v.currentTime = 0
    }
    setT(0)
  }
  const toggleMute = () => {
    const v = videoRef.current
    if (v) {
      v.muted = !v.muted
      setMuted(v.muted)
    }
  }

  return (
    <ExperienceShell
      title="버스 번호 인식 — Eager Evaluation"
      subtitle="실제 시연 영상을 재생하거나 스크럽하며, 각 처리가 어느 순간 트리거되어 준비되는지 확인해 보세요."
      hint="영상과 타임라인은 1:1로 동기화됩니다(영상 속 제스처 3.1s = 아래 플로우의 제스처). Lazy는 '선제 처리가 없었다면'의 비교로, GPS·노선캐싱·교차검증 없이 제스처 이후 YOLO→OCR→TTS만 실행합니다. 처리 소요는 개념 이해를 위한 예시값입니다."
      onReset={reset}
    >
      {/* 모드 선택 + 뷰 전환(시퀀스 다이어그램) */}
      <div ref={topRef} style={{ scrollMarginTop: 80 }} className="mb-5 flex flex-wrap items-center gap-2">
        {view === 'demo' &&
          (
            [
              { k: 'lazy', label: 'Lazy 방식 (기존)' },
              { k: 'eager', label: 'Eager 선제 처리' },
            ] as { k: Mode; label: string }[]
          ).map((m) => (
            <button
              key={m.k}
              onClick={() => setMode(m.k)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                mode === m.k ? 'bg-black text-white' : 'border border-black/15 text-gray-600 hover:border-black'
              }`}
            >
              {m.label}
            </button>
          ))}
        <button
          onClick={() => setView((v) => (v === 'demo' ? 'diagram' : 'demo'))}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-colors ${
            view === 'diagram'
              ? 'bg-black text-white'
              : 'border border-black/15 text-gray-600 hover:border-black hover:text-black'
          }`}
        >
          <Network className="h-4 w-4" />
          {view === 'diagram' ? '데모로 돌아가기' : '시퀀스 다이어그램'}
        </button>
      </div>

      {view === 'diagram' ? (
        /* 시퀀스 다이어그램 — 영상/플로우 자리를 같은 영역으로 대체 */
        <div className="max-h-[560px] overflow-auto rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
          <img
            src={SEQ}
            alt="버스 번호 인식 Pre-fetching 시퀀스 다이어그램"
            className="w-full min-w-[560px]"
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
            {mode === 'eager' && t >= ANNOUNCE && (
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
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm text-white"
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
                    <span className="truncate text-xs text-gray-700">
                      {l.label}
                      {l.extra && <span className="ml-1 align-middle text-[9px] text-sky-500">+Eager</span>}
                    </span>
                    <span className="truncate text-[10px] text-gray-400">{l.sub}</span>
                  </div>
                ))}
              </div>

              <div className="relative flex-1" style={{ height: lanes.length * ROW }}>
                {lanes.map((l, i) => {
                  const left = clampX(l.start)
                  const right = clampX(l.end)
                  const fillRight = clampX(Math.min(t, l.end))
                  const ongoing = l.end > SCALE
                  const done = t >= l.end && !ongoing
                  const active = t >= l.start && t < l.end
                  return (
                    <div key={l.key} className="absolute inset-x-0" style={{ top: i * ROW, height: ROW }}>
                      <div className="relative top-1/2 h-6 -translate-y-1/2">
                        <div
                          className="absolute h-full rounded-md opacity-20"
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
                <div className="absolute inset-y-0 z-20" style={{ left: `${clampX(GESTURE)}%` }}>
                  <div className="h-full border-l-2 border-black" />
                  <span className="absolute -top-0.5 left-1 whitespace-nowrap rounded bg-black px-1.5 py-0.5 text-[10px] text-white">
                    ✊ 제스처
                  </span>
                </div>

                {/* 버스 출발 마커 — Lazy에서만 표시 */}
                {mode === 'lazy' && (
                  <div className="absolute inset-y-0 right-0 z-20">
                    <div className="h-full border-l-2 border-dashed border-rose-400" />
                    <span className="absolute bottom-0 right-1 whitespace-nowrap rounded bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                      🚌 버스 출발
                    </span>
                  </div>
                )}

                {/* 재생 헤드 */}
                <div className="absolute inset-y-0 z-30 w-px bg-black/70" style={{ left: `${clampX(t)}%` }}>
                  <div className="absolute -top-1 -left-[3px] h-2 w-2 rounded-full bg-black" />
                </div>
              </div>
            </div>
          </div>

          {/* 준비/대기 비교 + 결과 (한 카드) */}
          <div className="mt-5 rounded-xl border border-black/10 p-4">
            <div className="flex flex-wrap gap-x-10 gap-y-2">
              <div>
                <span className="text-xs tracking-widest text-gray-400">TTS 준비</span>
                <p className={`text-lg font-light tabular-nums ${lead >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {Math.abs(lead).toFixed(1)}s
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {lead >= 0 ? '제스처 전 준비 완료' : '제스처 후에도 생성 중'}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs tracking-widest text-gray-400">안내까지 대기</span>
                <p className={`text-lg font-light tabular-nums ${caught ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {(deliverAt - GESTURE).toFixed(1)}s
                  <span className="ml-2 text-xs font-normal text-gray-400">제스처 → 안내</span>
                </p>
              </div>
            </div>

            <div className="mt-3 border-t border-black/5 pt-3 text-sm">
              {t < GESTURE ? (
                <p className="flex items-center gap-2 text-gray-500">
                  {mode === 'eager' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> 이벤트 트리거로 선제 처리 중 — 제스처 전에 결과를 준비합니다.
                    </>
                  ) : (
                    '제스처 전 — Lazy는 아직 아무 처리도 시작하지 않습니다.'
                  )}
                </p>
              ) : delivered && caught ? (
                <p className="text-emerald-600">🔊 {BUS_NO}번 버스입니다 — 제스처 즉시 음성 안내, 탑승 성공</p>
              ) : mode === 'lazy' && t >= BUS_DEPART ? (
                <p className="text-rose-500">🚌 버스 출발 — TTS 음성이 아직 생성 중이라 안내를 놓쳤습니다</p>
              ) : (
                <p className="flex items-center gap-2 text-gray-500">
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
