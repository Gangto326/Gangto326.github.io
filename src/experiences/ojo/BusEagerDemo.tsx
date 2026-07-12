import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { ExperienceShell } from '@/experiences/ExperienceShell'

type Mode = 'lazy' | 'eager'

interface Lane {
  key: string
  label: string
  sub: string
  start: number
  end: number
  color: string
  extra?: boolean // Eager를 위해 추가로 지불한 처리
}

const VID = `${import.meta.env.BASE_URL}assets/ojo/bus-demo.mp4`
const BUS_NO = '360'
const GESTURE = 3.0 // 영상 속 제스처 시점
const WATCH = 4.0 // 영상 속 스마트워치 알림 시점
const BUS_DEPART = 4.5 // 버스가 출발하는 시점(개념)
const ROW = 38

// Eager: 이벤트 트리거로 제스처 이전에 미리 처리. GPS·캐싱·교차검증은 Eager 전용(추가 지불 리소스).
const EAGER: Lane[] = [
  { key: 'gps', label: 'GPS·정류장 확인', sub: 'GeoHash Lv7 · O(1)', start: 0.2, end: 0.5, color: '#6366f1', extra: true },
  { key: 'cache', label: '노선 캐싱', sub: '공공데이터 API → Redis Set', start: 0.5, end: 1.2, color: '#0ea5e9', extra: true },
  { key: 'yolo', label: 'YOLO 버스 탐지', sub: '160° 광각 측면 포착', start: 1.2, end: 1.6, color: '#8b5cf6' },
  { key: 'ocr', label: 'OCR 번호 인식', sub: `CLOVA OCR → "${BUS_NO}"`, start: 1.6, end: 2.4, color: '#f59e0b' },
  { key: 'verify', label: '노선 교차검증', sub: 'Redis SISMEMBER', start: 2.4, end: 2.6, color: '#14b8a6', extra: true },
  { key: 'tts', label: 'TTS 음성 준비', sub: '안내 합성 → 대기', start: 2.6, end: 2.9, color: '#10b981' },
]

// Lazy(기존): GPS·캐싱·교차검증 없음. 제스처 이후 YOLO→OCR→TTS만 순차 실행.
const LAZY: Lane[] = [
  { key: 'yolo', label: 'YOLO 버스 탐지', sub: '제스처 후 탐지 시작', start: GESTURE, end: GESTURE + 0.4, color: '#8b5cf6' },
  { key: 'ocr', label: 'OCR 번호 인식', sub: `CLOVA OCR → "${BUS_NO}"`, start: GESTURE + 0.4, end: GESTURE + 1.6, color: '#f59e0b' },
  { key: 'tts', label: 'TTS 음성 준비', sub: '안내 합성', start: GESTURE + 1.6, end: GESTURE + 2.1, color: '#10b981' },
]

export function BusEagerDemo() {
  const [mode, setMode] = useState<Mode>('lazy')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(6.84)
  const [muted, setMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const lanes = mode === 'eager' ? EAGER : LAZY
  const ttsReadyAt = lanes[lanes.length - 1].end
  const deliverAt = mode === 'eager' ? WATCH : ttsReadyAt
  const caught = deliverAt <= BUS_DEPART
  const yoloEnd = lanes.find((l) => l.key === 'yolo')!.end
  const detected = t >= yoloEnd
  const delivered = t >= deliverAt
  const x = (s: number) => (s / duration) * 100

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      if (v.currentTime >= v.duration - 0.05) v.currentTime = 0
      void v.play()
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
      hint="영상은 Eager 시스템의 실제 동작(제스처 3s → 워치 알림 4s)입니다. Lazy는 '선제 처리가 없었다면'의 비교로, GPS·노선캐싱·교차검증 없이 제스처 이후 YOLO→OCR→TTS만 실행합니다. 타임라인의 처리 소요는 개념 이해를 위한 예시값입니다."
      onReset={reset}
    >
      {/* 모드 선택 — 기존(Lazy) 먼저 */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(
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
      </div>

      {/* 카메라 뷰 — 실제 시연 영상 */}
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          src={VID}
          muted={muted}
          playsInline
          preload="metadata"
          className="w-full"
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
        {delivered && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-3 top-3 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-medium text-white"
          >
            🔊 워치 알림
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
        <span className="w-12 shrink-0 text-right text-sm tabular-nums text-gray-500">
          {t.toFixed(1)}s
        </span>
      </div>

      {/* 간트 타임라인 */}
      <div className="mt-5 overflow-x-auto">
        <div className="flex min-w-[520px]">
          <div className="w-28 shrink-0">
            {lanes.map((l) => (
              <div key={l.key} style={{ height: ROW }} className="flex flex-col justify-center pr-3 text-right">
                <span className="text-xs text-gray-700">
                  {l.label}
                  {l.extra && <span className="ml-1 text-[9px] text-sky-500">+Eager</span>}
                </span>
                <span className="text-[10px] text-gray-400">{l.sub}</span>
              </div>
            ))}
          </div>

          <div className="relative flex-1" style={{ height: lanes.length * ROW }}>
            {lanes.map((l, i) => {
              const frac = Math.max(0, Math.min(1, (t - l.start) / (l.end - l.start)))
              const done = t >= l.end
              const barW = x(l.end) - x(l.start)
              return (
                <div key={l.key} className="absolute inset-x-0" style={{ top: i * ROW, height: ROW }}>
                  <div className="relative top-1/2 h-6 -translate-y-1/2">
                    <div
                      className="absolute h-full rounded-md opacity-20"
                      style={{ left: `${x(l.start)}%`, width: `${barW}%`, background: l.color }}
                    />
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
                ✊ 제스처 3s
              </span>
            </div>

            {/* 버스 출발 마커 */}
            <div className="absolute inset-y-0 z-20" style={{ left: `${x(BUS_DEPART)}%` }}>
              <div className="h-full border-l-2 border-dashed border-rose-400" />
              <span className="absolute bottom-0 left-1 whitespace-nowrap rounded bg-rose-500 px-1.5 py-0.5 text-[10px] text-white">
                🚌 출발
              </span>
            </div>

            {/* 재생 헤드 */}
            <div className="absolute inset-y-0 z-30 w-px bg-black/70" style={{ left: `${x(t)}%` }}>
              <div className="absolute -top-1 -left-[3px] h-2 w-2 rounded-full bg-black" />
            </div>
          </div>
        </div>
      </div>

      {/* 준비/대기 비교 + 결과 (한 카드) */}
      <div className="mt-5 rounded-xl border border-black/10 p-4">
        <div className="flex flex-wrap gap-x-10 gap-y-2">
          <div>
            <span className="text-xs tracking-widest text-gray-400">TTS 준비 완료</span>
            <p className="text-lg font-light tabular-nums">
              {ttsReadyAt.toFixed(1)}s
              <span className="ml-2 text-xs font-normal text-gray-400">
                {mode === 'eager' ? '제스처(3s) 이전' : '제스처(3s) 이후'}
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
          ) : delivered ? (
            <p className={caught ? 'text-emerald-600' : 'text-rose-500'}>
              🔊 {BUS_NO}번 버스입니다 —{' '}
              {caught ? '버스가 떠나기 전에 안내 완료, 탑승 성공' : '안내가 늦어 버스가 이미 출발'}
            </p>
          ) : (
            <p className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> 제스처 이후 처리 중… ({(t - GESTURE).toFixed(1)}s 경과)
            </p>
          )}
        </div>
      </div>
    </ExperienceShell>
  )
}
