import { useState } from 'react'
import { motion } from 'framer-motion'
import { ExperienceShell } from '@/experiences/ExperienceShell'

type ModeKey = 'sequential' | 'eager' | 'conditional'

interface Seg {
  label: string
  ms: number
  color: string
}

interface Mode {
  name: string
  totalMs: number
  fps: number
  layout: 'sequential' | 'parallel'
  segments: Seg[]
  note: string
}

// 모델별 색상
const YOLO = '#6366f1' // indigo
const HAND = '#10b981' // emerald
const DEPTH = '#f59e0b' // amber
const OVER = '#cbd5e1' // slate-300

// 모드 간 비교를 위한 고정 시간 스케일 (순차 총지연 = 100%)
const SCALE_MS = 320
const pct = (ms: number) => (ms / SCALE_MS) * 100

const MODES: Record<ModeKey, Mode> = {
  sequential: {
    name: '순차 실행',
    totalMs: 320,
    fps: 3,
    layout: 'sequential',
    segments: [
      { label: 'YOLO', ms: 60, color: YOLO },
      { label: 'MediaPipe', ms: 18, color: HAND },
      { label: 'Depth', ms: 200, color: DEPTH },
      { label: '오버헤드', ms: 42, color: OVER },
    ],
    note: '세 모델을 하나씩 순서대로 실행 — 시간이 모두 더해집니다. (비교군)',
  },
  eager: {
    name: 'Eager 병렬',
    totalMs: 200,
    fps: 5,
    layout: 'parallel',
    segments: [
      { label: 'YOLO', ms: 60, color: YOLO },
      { label: 'MediaPipe', ms: 18, color: HAND },
      { label: 'Depth', ms: 200, color: DEPTH },
    ],
    note: 'asyncio.gather로 세 모델을 동시에 시작 — 가장 느린 Depth(200ms)에 수렴합니다.',
  },
  conditional: {
    name: '조건부 추론 (평시)',
    totalMs: 18,
    fps: 55,
    layout: 'parallel',
    segments: [{ label: 'MediaPipe', ms: 18, color: HAND }],
    note: '평시엔 게이트가 모두 닫혀 MediaPipe(손 인식)만 실행 — YOLO·Depth는 스킵됩니다.',
  },
}

const ORDER: ModeKey[] = ['sequential', 'eager', 'conditional']

function SequentialBars({ mode }: { mode: Mode }) {
  let acc = 0
  return (
    <div className="relative h-10 w-full">
      {mode.segments.map((s) => {
        const left = pct(acc)
        const width = pct(s.ms)
        acc += s.ms
        return (
          <motion.div
            key={s.label}
            className="absolute top-0 flex h-full items-center justify-center overflow-hidden rounded-md text-[10px] font-medium text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: `${left}%`, width: `${width}%` }}
            transition={{ duration: 0.4 }}
            style={{ background: s.color }}
            title={`${s.label} · ${s.ms}ms`}
          >
            {width > 10 ? s.label : ''}
          </motion.div>
        )
      })}
    </div>
  )
}

function ParallelBars({ mode }: { mode: Mode }) {
  return (
    <div className="space-y-2">
      {mode.segments.map((s) => (
        <div key={s.label} className="relative h-7 w-full">
          <motion.div
            className="flex h-full items-center overflow-hidden rounded-md px-2 text-[10px] font-medium text-white"
            initial={{ width: 0 }}
            animate={{ width: `${pct(s.ms)}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{ background: s.color }}
            title={`${s.label} · ${s.ms}ms`}
          >
            <span className="truncate">
              {s.label} · {s.ms}ms
            </span>
          </motion.div>
        </div>
      ))}
    </div>
  )
}

function Timeline({ mode }: { mode: Mode }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-gray-300">
        <span>0ms</span>
        <span>160ms</span>
        <span>320ms</span>
      </div>

      <div className="rounded-xl bg-gray-50 p-3">
        {/* 공통 좌표계: 폭 100% = 320ms. 순차·병렬 막대가 같은 기준으로 그려진다 */}
        <div className="relative">
          {mode.layout === 'sequential' ? (
            <SequentialBars mode={mode} />
          ) : (
            <ParallelBars mode={mode} />
          )}
          {/* 완료 시점 표시선 */}
          <motion.div
            className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-black/40"
            initial={false}
            animate={{ left: `${pct(mode.totalMs)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <p className="mt-2 text-right text-[11px] text-gray-400">
        점선 = 프레임 처리 완료 시점 ({mode.totalMs}ms)
      </p>
    </div>
  )
}

export function OjoPipelineDemo() {
  const [modeKey, setModeKey] = useState<ModeKey>('sequential')
  const mode = MODES[modeKey]

  return (
    <ExperienceShell
      title="AI 파이프라인 시뮬레이터"
      subtitle="세 AI 모델을 어떻게 스케줄링하느냐에 따라 실시간성이 어떻게 달라지는지 직접 바꿔보세요."
      hint="막대는 각 모델의 실제 추론 시간(YOLO 60 · MediaPipe 18 · Depth 200ms)에 비례하며, 세 모드 모두 동일한 320ms 스케일 위에 그려집니다. 총지연·fps는 프로젝트 실측값입니다."
      onReset={() => setModeKey('sequential')}
    >
      {/* 모드 선택 */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ORDER.map((k) => (
          <button
            key={k}
            onClick={() => setModeKey(k)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              modeKey === k
                ? 'bg-black text-white'
                : 'border border-black/15 text-gray-600 hover:border-black'
            }`}
          >
            {MODES[k].name}
          </button>
        ))}
      </div>

      {/* 결과 판독 */}
      <div className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-3">
        <div>
          <p className="text-xs tracking-widest text-gray-400">총 지연</p>
          <p className="text-3xl font-light tabular-nums">
            {mode.totalMs}
            <span className="ml-1 text-base text-gray-400">ms</span>
          </p>
        </div>
        <div>
          <p className="text-xs tracking-widest text-gray-400">처리 속도</p>
          <p className="text-3xl font-light tabular-nums">
            {mode.fps}
            <span className="ml-1 text-base text-gray-400">fps</span>
          </p>
        </div>
        <div className="min-w-[3rem] flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-black"
              initial={false}
              animate={{ width: `${Math.min((mode.fps / 55) * 100, 100)}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">실시간성 (55fps 기준)</p>
        </div>
      </div>

      {/* 타임라인 */}
      <Timeline mode={mode} />

      {/* 설명 */}
      <p className="mt-5 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-600">
        {mode.note}
      </p>
    </ExperienceShell>
  )
}
