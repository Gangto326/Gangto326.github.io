import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Hand, ImageIcon, Loader2 } from 'lucide-react'
import { ExperienceShell } from '@/experiences/ExperienceShell'

type Mode = 'lazy' | 'eager'
type Status = 'idle' | 'running' | 'done'

// 버스 인식 파이프라인 단계 (누적 완료 시각 ms — 예시 소요)
const STEPS = [
  { label: '정류장 노선 캐싱', sub: '공공데이터 API → Redis Set', end: 1000 },
  { label: 'YOLO 버스 탐지', sub: 'ByteTrack track_id 할당', end: 1600 },
  { label: 'OCR 번호 인식', sub: 'CLOVA OCR', end: 2800 },
  { label: '노선 교차검증', sub: 'Redis SISMEMBER · O(1)', end: 2900 },
  { label: 'TTS 음성 준비', sub: '', end: 3400 },
]
const TOTAL = 3400
const BUS_WAIT_S = 2.5 // 제스처 후 버스가 기다려주는 시간
const BUS_NO = '173'

export function BusEagerDemo() {
  const [mode, setMode] = useState<Mode>('lazy')
  const [status, setStatus] = useState<Status>('idle')
  const [elapsed, setElapsed] = useState(0) // ms
  const timerRef = useRef<number | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
  useEffect(() => () => clearTimer(), [])

  const reset = () => {
    clearTimer()
    setStatus('idle')
    setElapsed(0)
  }

  const switchMode = (m: Mode) => {
    reset()
    setMode(m)
  }

  const gesture = () => {
    if (status !== 'idle') return
    if (mode === 'eager') {
      // 이미 선제 처리 완료 → 즉시 전달
      setElapsed(120)
      setStatus('done')
      return
    }
    // Lazy: 제스처 후에야 파이프라인 시작
    setStatus('running')
    setElapsed(0)
    const start = performance.now()
    timerRef.current = window.setInterval(() => {
      const e = performance.now() - start
      if (e >= TOTAL) {
        setElapsed(TOTAL)
        setStatus('done')
        clearTimer()
      } else {
        setElapsed(e)
      }
    }, 50)
  }

  const stepDone = (end: number) =>
    mode === 'eager' || status === 'done' || elapsed >= end
  const elapsedS = (elapsed / 1000).toFixed(1)
  const caught = status === 'done' && elapsed / 1000 <= BUS_WAIT_S
  const progress = Math.min(elapsed / TOTAL, 1) * 100

  return (
    <ExperienceShell
      title="버스 번호 인식 — Eager Evaluation"
      subtitle="제스처를 기다렸다 처리하는 Lazy 방식과, 정류장 체류 시점부터 미리 처리해두는 Eager 방식을 비교해 보세요."
      hint="단계별 소요 시간은 개념 이해를 위한 예시값입니다. 핵심은 '언제 계산을 시작하는가' — Eager는 사용자의 요청(제스처) 이전에 모든 처리를 끝내 둡니다."
      onReset={reset}
    >
      {/* 시퀀스 다이어그램 이미지 자리 */}
      <div className="mb-6 flex aspect-[16/6] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-gray-50 text-gray-300">
        <ImageIcon className="h-6 w-6" />
        <span className="text-xs">버스 인식 시퀀스 다이어그램 (이미지 준비 중)</span>
      </div>

      {/* 모드 선택 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            { k: 'lazy', label: 'Lazy 방식 (기존)' },
            { k: 'eager', label: 'Eager 선제 처리' },
          ] as { k: Mode; label: string }[]
        ).map((m) => (
          <button
            key={m.k}
            onClick={() => switchMode(m.k)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              mode === m.k
                ? 'bg-black text-white'
                : 'border border-black/15 text-gray-600 hover:border-black'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* 파이프라인 단계 */}
        <div className="rounded-2xl bg-gray-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs tracking-widest text-gray-400">
              처리 파이프라인
            </p>
            {mode === 'eager' && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-600">
                정류장 체류 중 선제 완료
              </span>
            )}
          </div>
          <ul className="space-y-2.5">
            {STEPS.map((s) => {
              const done = stepDone(s.end)
              const active =
                mode === 'lazy' &&
                status === 'running' &&
                !done &&
                elapsed >= (STEPS[STEPS.indexOf(s) - 1]?.end ?? 0)
              return (
                <li key={s.label} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white transition-colors ${
                      done
                        ? 'bg-emerald-500'
                        : active
                          ? 'bg-black'
                          : 'bg-gray-200'
                    }`}
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm ${done ? 'text-gray-800' : 'text-gray-500'}`}
                    >
                      {s.label}
                    </p>
                    {s.sub && (
                      <p className="text-[11px] text-gray-400">{s.sub}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Lazy 진행 바 */}
          {mode === 'lazy' && status !== 'idle' && (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  className="h-full rounded-full bg-black"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.05, ease: 'linear' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 제스처 & 결과 */}
        <div className="flex flex-col justify-between rounded-2xl border border-black/10 p-5">
          <div>
            <p className="text-xs tracking-widest text-gray-400">상황</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              시각장애인이 정류장에 도착했습니다.{' '}
              {mode === 'eager'
                ? '시스템은 체류를 감지하고 버스 번호를 미리 읽어 두었습니다.'
                : '아직 아무 처리도 시작하지 않았습니다.'}
            </p>
          </div>

          <button
            onClick={gesture}
            disabled={status !== 'idle'}
            className="my-5 inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3.5 text-sm text-white transition-transform enabled:hover:-translate-y-0.5 disabled:opacity-40"
          >
            <Hand className="h-4 w-4" />
            제스처하기 — "이 버스 몇 번이야?"
          </button>

          {/* 결과 */}
          <div className="min-h-[4.5rem] rounded-xl bg-gray-50 p-4 text-sm">
            {status === 'idle' && (
              <p className="text-gray-400">
                버튼을 눌러 버스 번호를 물어보세요.
              </p>
            )}
            {status === 'running' && (
              <p className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> 처리 중… {elapsedS}초
              </p>
            )}
            {status === 'done' && (
              <div>
                <p className="text-base font-medium text-gray-900">
                  🔊 {BUS_NO}번 버스입니다
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    {elapsedS}초
                  </span>
                </p>
                <p
                  className={`mt-1 text-sm ${caught ? 'text-emerald-600' : 'text-rose-500'}`}
                >
                  {caught
                    ? '🚌 버스가 떠나기 전에 안내 완료 — 탑승 성공'
                    : '🚌 안내가 늦어 버스가 이미 출발했습니다'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ExperienceShell>
  )
}
