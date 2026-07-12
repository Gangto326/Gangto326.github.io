import { useMemo, useState } from 'react'
import { ExperienceShell } from '@/experiences/ExperienceShell'
import lidarData from '@/data/lidarData.json'

// 실제 라이다 15분 데이터(100,517행)를 다운샘플·투영한 값
const W = 460
const H = 300
const RAW_ROWS = lidarData.rows
const RES_DATA = lidarData.res as Record<string, { cells: number; pct: number }>
const POINTS = (lidarData.points as [number, number, number][]).map(([x, y, pm]) => ({ x, y, pm }))

// 해상도 → 화면 육각 반지름(px)
const RES_SIZE: Record<number, number> = { 9: 40, 10: 24, 11: 15 }

// 실제 보간 지도 / H3 히트맵 (부채꼴 정렬용, 배경 투명 크롭)
const INTERP = `${import.meta.env.BASE_URL}assets/lidar/pm-interp.png`
const H3MAP = `${import.meta.env.BASE_URL}assets/lidar/pm-h3.png`

// PM 농도 → 색 (Turbo 계열 근사). 실측 분포(p50≈63, p90≈233)에 맞춰 30~250 범위.
const STOPS: [number, [number, number, number]][] = [
  [30, [59, 76, 192]],
  [90, [14, 165, 233]],
  [150, [16, 185, 129]],
  [200, [234, 179, 8]],
  [250, [239, 68, 68]],
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

export function LidarH3Demo() {
  const [slide, setSlide] = useState(0) // 0=원천 점, 1=H3 셀 집계
  const [res, setRes] = useState(10)
  const [view, setView] = useState<'interactive' | 'maps'>('interactive')
  const [fade, setFade] = useState(0) // 0=보간, 1=H3
  const size = RES_SIZE[res]

  const cells = useMemo(() => {
    const map = new Map<string, { q: number; r: number; sum: number; cnt: number }>()
    for (const p of POINTS) {
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
  }, [size])

  const real = RES_DATA[String(res)]
  const reset = () => {
    setSlide(0)
    setRes(10)
    setView('interactive')
    setFade(0)
  }

  return (
    <ExperienceShell
      title="H3 격자 압축 시각화"
      subtitle="실제 라이다 데이터를 H3 육각 셀로 집계하면 저장량이 어떻게 줄어드는지, 해상도를 바꿔가며 확인해 보세요."
      hint="화면은 실제 15분 측정 데이터(100,517행)를 다운샘플해 투영한 것으로, 색은 실측 PM10 농도(파랑=저 · 빨강=고)입니다. 아래 '실측' 셀 수·압축률은 전체 데이터를 실제 H3로 집계한 결과이며, H3 해상도는 고객사 구역 통계의 넓이에 맞춰 선정했습니다."
      onReset={reset}
    >
      {/* 뷰 선택 */}
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            { k: 'interactive', label: '인터랙티브' },
            { k: 'maps', label: '실제 미세먼지 지도' },
          ] as { k: 'interactive' | 'maps'; label: string }[]
        ).map((v) => (
          <button
            key={v.k}
            onClick={() => setView(v.k)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${
              view === v.k ? 'bg-black text-white' : 'border border-black/15 text-gray-600 hover:border-black'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'maps' ? (
        <div>
          {/* 슬라이더 위로 (인터랙티브와 동일 위치) */}
          <div className="mb-4 flex items-center gap-3 text-sm text-gray-500">
            <span className="shrink-0">보간 (표시용)</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={fade}
              onChange={(e) => setFade(Number(e.target.value))}
              className="flex-1 accent-black"
              aria-label="보간 ↔ H3 crossfade"
            />
            <span className="shrink-0">H3 (저장)</span>
          </div>
          {/* crossfade — 인터랙티브와 동일한 크기(aspect 460/300) */}
          <div
            className="relative w-full overflow-hidden rounded-2xl bg-[#0b0d12]"
            style={{ aspectRatio: '460 / 300' }}
          >
            <img
              src={INTERP}
              alt="보간 미세먼지 지도"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: 1 - fade }}
            />
            <img
              src={H3MAP}
              alt="H3 미세먼지 히트맵"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: fade }}
            />
            <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              {fade < 0.5 ? '보간 지도 · 사용자 표시용' : 'H3 집계 · 실제 저장 데이터'}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            <strong className="font-semibold text-gray-900">보간 지도</strong>는 사용자에게 보여주는 미세먼지 지도이고,{' '}
            <strong className="font-semibold text-gray-900">H3 히트맵</strong>은 실제 DB에 저장되는 데이터입니다.
            H3 해상도는 고객사 구역 통계의 넓이에 맞춰 선정했습니다. 슬라이더로 두 부채꼴을 겹쳐,
            매끄러운 표시용 지도가 저장용 육각 셀로 이산화되는 과정을 비교해 보세요.
          </p>
        </div>
      ) : (
        <>
      {/* 컨트롤 — 원천 ↔ H3 집계 슬라이더 */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 text-sm">
          <span className="shrink-0 text-gray-500">원천 점</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={slide}
            onChange={(e) => setSlide(Number(e.target.value))}
            className="flex-1 accent-black"
            aria-label="원천 측정점 ↔ H3 셀 집계"
          />
          <span className="shrink-0 text-gray-500">H3 집계</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">해상도</span>
          <input
            type="range"
            min={9}
            max={11}
            step={1}
            value={res}
            onChange={(e) => setRes(Number(e.target.value))}
            className="w-24 accent-black"
            aria-label="H3 해상도"
          />
          <span className="w-16 tabular-nums text-gray-700">Level {res}</span>
        </div>
      </div>

      {/* 시각화 */}
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#0b0d12]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
          {POINTS.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.4} fill={pmColor(p.pm)} opacity={0.85 - slide * 0.72} />
          ))}
          {slide > 0.02 &&
            cells.map((c, i) => (
              <polygon
                key={i}
                points={hexPath(c.x, c.y, size - 0.6)}
                fill={pmColor(c.avg)}
                fillOpacity={0.82 * slide}
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
        {slide < 0.5
          ? '15분마다 유입되는 약 10만 행의 실제 원천 측정점입니다. 이대로 저장하면 데드튜플·VACUUM 부하가 커집니다. 슬라이더를 오른쪽으로 밀어 H3 셀 집계를 확인하세요.'
          : `측정점을 Level ${res} 육각 셀로 묶어 셀당 평균·최대·샘플 수만 저장합니다. H3 해상도는 고객사 구역 통계의 넓이에 맞춰 선정했습니다. 해상도를 낮출수록(9로) 셀이 커지고 개수가 줄어 압축률이 높아집니다.`}
      </p>
        </>
      )}
    </ExperienceShell>
  )
}
