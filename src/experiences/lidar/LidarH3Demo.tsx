import { useMemo, useState } from 'react'
import { ExperienceShell } from '@/experiences/ExperienceShell'

// 화면 좌표계
const W = 460
const H = 300

// 실측(15분 데이터 1건 = 100,517행) — res별 집계 후 셀 수·압축률 (DEMO_SPEC)
const RAW_ROWS = 100517
const RES_DATA: Record<number, { cells: number; pct: number }> = {
  9: { cells: 224, pct: 99.8 },
  10: { cells: 1410, pct: 98.6 },
  11: { cells: 9452, pct: 90.6 },
}
// 해상도 → 화면 육각 반지름(px). 작을수록 셀이 많아진다.
const RES_SIZE: Record<number, number> = { 9: 40, 10: 24, 11: 15 }

// PM 농도 → 색 (Turbo 계열 근사). 범위 30~600.
const STOPS: [number, [number, number, number]][] = [
  [30, [59, 76, 192]],
  [120, [14, 165, 233]],
  [250, [16, 185, 129]],
  [400, [234, 179, 8]],
  [550, [239, 68, 68]],
]
const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`
function pmColor(v: number): string {
  if (v <= STOPS[0][0]) return rgb(STOPS[0][1])
  if (v >= STOPS[STOPS.length - 1][0]) return rgb(STOPS[STOPS.length - 1][1])
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [v0, c0] = STOPS[i]
    const [v1, c1] = STOPS[i + 1]
    if (v >= v0 && v <= v1) {
      const t = (v - v0) / (v1 - v0)
      return rgb([0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * t)) as [number, number, number])
    }
  }
  return rgb(STOPS[0][1])
}

// 픽셀 → 육각 좌표(pointy-top) 후 반올림
function cubeRound(q: number, r: number) {
  let x = q
  let z = r
  let y = -x - z
  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)
  const dx = Math.abs(rx - x)
  const dy = Math.abs(ry - y)
  const dz = Math.abs(rz - z)
  if (dx > dy && dx > dz) rx = -ry - rz
  else if (dy > dz) ry = -rx - rz
  else rz = -rx - ry
  return { q: rx, r: rz }
}
function pixelToHex(px: number, py: number, size: number) {
  const q = ((Math.sqrt(3) / 3) * px - (1 / 3) * py) / size
  const r = ((2 / 3) * py) / size
  return cubeRound(q, r)
}
function hexCenter(q: number, r: number, size: number) {
  return { x: size * Math.sqrt(3) * (q + r / 2), y: size * (3 / 2) * r }
}
function hexPath(cx: number, cy: number, size: number) {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    pts.push(`${(cx + size * Math.cos(a)).toFixed(1)},${(cy + size * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

interface Pt {
  x: number
  y: number
  pm: number
}

export function LidarH3Demo() {
  const [agg, setAgg] = useState(false) // false=원천, true=H3 집계
  const [res, setRes] = useState(10)

  // 센서는 직선 프로파일(스캔 경로)로 측정 → 몇 개 라인 위에 점 분포. 결정적 시드.
  const points = useMemo<Pt[]>(() => {
    const lines: [[number, number], [number, number]][] = [
      [[30, 45], [432, 92]],
      [[40, 120], [424, 150]],
      [[28, 205], [430, 188]],
      [[60, 268], [400, 244]],
    ]
    const hot = { x: 300, y: 130, r: 92 }
    let seed = 987654321
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    const pts: Pt[] = []
    for (const [[x1, y1], [x2, y2]] of lines) {
      const dx = x2 - x1
      const dy = y2 - y1
      const len = Math.hypot(dx, dy)
      const nx = -dy / len
      const ny = dx / len
      const n = 320
      for (let i = 0; i < n; i++) {
        const t = i / n
        const j = (rnd() - 0.5) * 15
        const x = x1 + dx * t + nx * j
        const y = y1 + dy * t + ny * j
        const d = Math.hypot(x - hot.x, y - hot.y)
        const hv = Math.exp(-(d * d) / (2 * hot.r * hot.r)) * 500
        const pm = Math.min(600, 42 + rnd() * 28 + hv)
        pts.push({ x, y, pm })
      }
    }
    return pts
  }, [])

  const size = RES_SIZE[res]
  const cells = useMemo(() => {
    const map = new Map<string, { q: number; r: number; sum: number; cnt: number }>()
    for (const p of points) {
      const { q, r } = pixelToHex(p.x, p.y, size)
      const key = `${q},${r}`
      let c = map.get(key)
      if (!c) {
        c = { q, r, sum: 0, cnt: 0 }
        map.set(key, c)
      }
      c.sum += p.pm
      c.cnt++
    }
    return [...map.values()].map((c) => {
      const { x, y } = hexCenter(c.q, c.r, size)
      return { x, y, avg: c.sum / c.cnt }
    })
  }, [points, size])

  const real = RES_DATA[res]
  const reset = () => {
    setAgg(false)
    setRes(10)
  }

  return (
    <ExperienceShell
      title="H3 격자 압축 시각화"
      subtitle="수많은 원천 측정점을 H3 육각 셀 단위로 집계하면 저장량이 어떻게 줄어드는지, 해상도를 바꿔가며 확인해 보세요."
      hint="화면은 개념 설명용 예시(스캔 라인 위 측정점)이며, 색은 PM 농도(파랑=저농도 · 빨강=고농도)입니다. 아래 '실측' 수치는 15분 데이터 1건(100,517행)을 실제 H3로 집계한 결과입니다."
      onReset={reset}
    >
      {/* 컨트롤 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { k: false, label: '원천 측정점' },
            { k: true, label: 'H3 셀 집계' },
          ] as { k: boolean; label: string }[]
        ).map((m) => (
          <button
            key={String(m.k)}
            onClick={() => setAgg(m.k)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              agg === m.k ? 'bg-black text-white' : 'border border-black/15 text-gray-600 hover:border-black'
            }`}
          >
            {m.label}
          </button>
        ))}
        <div className={`ml-auto flex items-center gap-2 text-sm ${agg ? '' : 'opacity-40'}`}>
          <span className="text-gray-500">해상도</span>
          <input
            type="range"
            min={9}
            max={11}
            step={1}
            value={res}
            disabled={!agg}
            onChange={(e) => setRes(Number(e.target.value))}
            className="w-28 accent-black"
            aria-label="H3 해상도"
          />
          <span className="w-16 tabular-nums text-gray-700">Level {res}</span>
        </div>
      </div>

      {/* 시각화 */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#0b0d12]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
          {/* 원천 점 (집계 뷰에선 흐리게) */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={pmColor(p.pm)} opacity={agg ? 0.12 : 0.85} />
          ))}
          {/* H3 셀 */}
          {agg &&
            cells.map((c, i) => (
              <polygon
                key={i}
                points={hexPath(c.x, c.y, size - 0.6)}
                fill={pmColor(c.avg)}
                fillOpacity={0.82}
                stroke="#0b0d12"
                strokeWidth={0.8}
              />
            ))}
        </svg>
      </div>

      {/* 카운터 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs tracking-widest text-gray-400">원천 측정 (15분)</p>
          <p className="mt-1 text-2xl font-light tabular-nums">
            {RAW_ROWS.toLocaleString()}
            <span className="ml-1 text-sm text-gray-400">행</span>
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs tracking-widest text-gray-400">H3 셀 (Level {res})</p>
          <p className="mt-1 text-2xl font-light tabular-nums">
            {real.cells.toLocaleString()}
            <span className="ml-1 text-sm text-gray-400">셀</span>
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs tracking-widest text-emerald-600/70">저장 압축률</p>
          <p className="mt-1 text-2xl font-light tabular-nums text-emerald-600">
            −{real.pct}
            <span className="ml-1 text-sm">%</span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        {agg
          ? `측정점을 Level ${res} 육각 셀로 묶어 셀당 평균·최대·샘플 수만 저장합니다. 해상도를 낮출수록(9로) 셀이 커지고 개수가 줄어 압축률이 높아집니다.`
          : '15분마다 유입되는 약 20만 행의 원천 측정점입니다. 이대로 저장하면 데드튜플·VACUUM 부하가 커집니다. "H3 셀 집계"를 눌러보세요.'}
      </p>
    </ExperienceShell>
  )
}
