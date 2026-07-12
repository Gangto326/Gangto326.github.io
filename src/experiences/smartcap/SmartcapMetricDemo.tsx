import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Car, Cylinder, StepForward } from 'lucide-react'
import { ExperienceShell } from '@/experiences/ExperienceShell'

/**
 * 똑똑캡 — 객체별 3종 메트릭 시뮬레이터.
 *
 * 실제 저장소(smartcap-ai/app/services/risk_detection/*)의 판별식·임계값만 추출해
 * 프론트에서 재현한다. CV 추론은 하지 않고, 탐지 결과(박스 높이·단면 지름·소실점 좌표)를
 * 슬라이더 입력으로 대체해 SAFE→WARNING→DANGER 상태 머신을 굴린다.
 *
 * 세 판별식 모두 "다음 단계로만 올라가는" 단방향 상태 머신이라, 한 번 올라간 등급은
 * 리셋 전까지 유지된다(실제 로직과 동일). 원통·계단의 "연속 프레임" 히스테리시스는
 * 120ms 프레임 틱으로 재현해, 임계 이상을 충분히 유지해야 등급이 오른다.
 */

type Sev = 'SAFE' | 'WARNING' | 'DANGER'
type ObjKey = 'vehicle' | 'material' | 'stairs'

const SEV: Record<Sev, { c: string; ko: string; tx: string; bg: string; bd: string }> = {
  SAFE: { c: '#10b981', ko: '안전 · SAFE', tx: 'text-emerald-600', bg: 'bg-emerald-50', bd: 'border-emerald-200' },
  WARNING: { c: '#f59e0b', ko: '주의 · WARNING', tx: 'text-amber-600', bg: 'bg-amber-50', bd: 'border-amber-200' },
  DANGER: { c: '#ef4444', ko: '위험 · DANGER', tx: 'text-rose-600', bg: 'bg-rose-50', bd: 'border-rose-200' },
}

// ── 캔버스 (계산은 실제 코드처럼 640 높이 기준) ──────────────────────────────
const CW = 600
const CH = 640
const CX = 300

// ── 차량: AABB 높이 변화율 (vehicles.py) ────────────────────────────────────
const V_FAR = 25 // baseline 거리(m)
const V_NEAR = 3
const V_BASE_H = 70 // baseline 박스 높이(px) — 가장 먼 거리에서 고정
const V_WARN = 0.5 // +50% → WARNING
const V_DANGER = 2.0 // +200% → DANGER

// ── 원통 자재: 짧은 변(단면 지름) (materials.py) ─────────────────────────────
const M_FAR = 14
const M_NEAR = 2
const M_BASE_D = 46 // baseline 단면 지름(px)
const M_LMAX = 360 // 정면일 때 긴 변 최대 길이(px)
const M_FIRST = 1.1 // ×1.1 → WARNING 후보
const M_SECOND = 1.35 // ×1.35 → DANGER 후보
const M_SECOND_REL = 1.25 // 1차 알림 대비 ×1.25 → DANGER 후보
const M_FRAMES = 3 // 연속 3프레임 유지(히스테리시스)

// ── 하행 계단: 소실점 Y (fall_zone.py) ──────────────────────────────────────
const STAIR_ANGLE = (35 * Math.PI) / 180
const STAIR_LANDING = 287
const S_DY = STAIR_LANDING * Math.sin(STAIR_ANGLE) // ≈ 164.6
// reference_y = 640/2 - (640 - cy) - dy = cy - 484.6
const S_REF = (cy: number) => cy - (CH / 2 + S_DY) // == cy - 484.6
const S_SCORE_WARN = 2 // 하행 점수 ≥2 → WARNING
const S_BOTTOM_DANGER = Math.round(CH * 0.99) // 633 → DANGER
const S_BOTTOM_DELTA = 50 // 1차 대비 +50px → DANGER
const S_HALF = 150 // 밑변 절반 너비(px)

// 계단 슬라이더 도메인 (기본값이 상행=SAFE가 되도록 설정)
const S_VP_MIN = 40
const S_VP_MAX = 470
const S_CY_MIN = 560
const S_CY_MAX = 640

// ── 상태 머신 (프레임 틱으로 갱신) ───────────────────────────────────────────
interface VState {
  s: Sev
  vf: number
}
interface MState {
  s: Sev
  firstAlert: number
  cw: number
  cd: number
}
interface SState {
  s: Sev
  score: number
  firstCy: number
}
interface Machine {
  vehicle: VState
  material: MState
  stairs: SState
}
const INIT: Machine = {
  vehicle: { s: 'SAFE', vf: 0 },
  material: { s: 'SAFE', firstAlert: M_BASE_D, cw: 0, cd: 0 },
  stairs: { s: 'SAFE', score: 0, firstCy: 0 },
}

// 유형 오프셋(config.py) + 심각도 → Risk Code(0~10)
const CODE_OFFSET: Record<ObjKey, number> = { material: 0, stairs: 3, vehicle: 6 }
const CODE_LABELS = [
  '안전',
  '자재 주의',
  '자재 위험',
  '자재 사고',
  '낙상 주의',
  '낙상 위험',
  '낙상 사고',
  '차량 주의',
  '차량 위험',
  '차량 사고',
  '원인 불명',
]
const codeOf = (k: ObjKey, s: Sev) => (s === 'SAFE' ? 0 : CODE_OFFSET[k] + (s === 'WARNING' ? 1 : 2))

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const OBJECTS: { k: ObjKey; label: string; Icon: typeof Car }[] = [
  { k: 'vehicle', label: '차량', Icon: Car },
  { k: 'material', label: '원통 자재', Icon: Cylinder },
  { k: 'stairs', label: '하행 계단', Icon: StepForward },
]

export function SmartcapMetricDemo() {
  const [active, setActive] = useState<ObjKey>('vehicle')
  const [machine, setMachine] = useState<Machine>(INIT)

  // 슬라이더 입력(0~100 접근도 / 회전각 / 소실점·밑변 위치)
  const [vApp, setVApp] = useState(0) // 차량 접근도
  const [mApp, setMApp] = useState(0) // 자재 접근도
  const [mRot, setMRot] = useState(0) // 자재 회전(deg)
  const [sPitch, setSPitch] = useState(0) // 고개 숙임 → 소실점 y
  const [sApp, setSApp] = useState(0) // 계단 접근 → 밑변 y

  // 프레임 틱이 최신 입력을 읽도록 ref 미러링
  const inRef = useRef({ vApp, mApp, sPitch, sApp })
  inRef.current = { vApp, mApp, sPitch, sApp }
  const activeRef = useRef(active)
  activeRef.current = active

  // ── 파생값(현재 슬라이더 기준 순간값) ──
  const vDist = lerp(V_FAR, V_NEAR, vApp / 100)
  const vHeight = (V_BASE_H * V_FAR) / vDist
  const vInc = V_FAR / vDist - 1

  const mDist = lerp(M_FAR, M_NEAR, mApp / 100)
  const mRatio = M_FAR / mDist
  const mDia = M_BASE_D * mRatio
  const mLong = M_LMAX * (0.4 + 0.6 * Math.cos((mRot * Math.PI) / 180))

  const sVp = lerp(S_VP_MIN, S_VP_MAX, sPitch / 100)
  const sCy = lerp(S_CY_MIN, S_CY_MAX, sApp / 100)
  const sRef = S_REF(sCy)
  const sDescending = sRef < sVp

  // ── 프레임 틱(120ms): 활성 객체의 상태 머신만 갱신 ──
  useEffect(() => {
    const id = setInterval(() => {
      const k = activeRef.current
      const { vApp, mApp, sPitch, sApp } = inRef.current
      setMachine((prev) => {
        if (k === 'vehicle') {
          const d = lerp(V_FAR, V_NEAR, vApp / 100)
          const inc = V_FAR / d - 1
          let { s, vf } = prev.vehicle
          vf = Math.min(vf + 1, 10)
          if (vf >= 2) {
            if (s === 'SAFE' && inc > V_WARN) s = 'WARNING'
            else if (s === 'WARNING' && inc > V_DANGER) s = 'DANGER'
          }
          return { ...prev, vehicle: { s, vf } }
        }
        if (k === 'material') {
          const d = lerp(M_FAR, M_NEAR, mApp / 100)
          const ratio = M_FAR / d
          const dia = M_BASE_D * ratio
          let { s, firstAlert, cw, cd } = prev.material
          if (s === 'SAFE') {
            cw = ratio >= M_FIRST ? cw + 1 : 0
            if (cw >= M_FRAMES) {
              s = 'WARNING'
              firstAlert = dia
              cw = 0
            }
          } else if (s === 'WARNING') {
            const cond = dia / firstAlert >= M_SECOND_REL || ratio >= M_SECOND
            cd = cond ? cd + 1 : 0
            if (cd >= M_FRAMES) s = 'DANGER'
          }
          return { ...prev, material: { s, firstAlert, cw, cd } }
        }
        // stairs
        const cy = lerp(S_CY_MIN, S_CY_MAX, sApp / 100)
        const vp = lerp(S_VP_MIN, S_VP_MAX, sPitch / 100)
        const desc = S_REF(cy) < vp
        let { s, score, firstCy } = prev.stairs
        score = clamp(score + (desc ? 1 : -1), 0, 4)
        if (s === 'SAFE' && score >= S_SCORE_WARN) {
          s = 'WARNING'
          firstCy = cy
        } else if (s === 'WARNING') {
          if (cy >= S_BOTTOM_DANGER || cy >= firstCy + S_BOTTOM_DELTA) s = 'DANGER'
        }
        return { ...prev, stairs: { s, score, firstCy } }
      })
    }, 120)
    return () => clearInterval(id)
  }, [])

  const reset = () => {
    setMachine(INIT)
    setVApp(0)
    setMApp(0)
    setMRot(0)
    setSPitch(0)
    setSApp(0)
  }

  // Risk Code 집계 — 세 객체 코드의 최댓값
  const codes: Record<ObjKey, number> = {
    material: codeOf('material', machine.material.s),
    stairs: codeOf('stairs', machine.stairs.s),
    vehicle: codeOf('vehicle', machine.vehicle.s),
  }
  const finalCode = Math.max(codes.material, codes.stairs, codes.vehicle)

  const curSev = machine[active].s

  return (
    <ExperienceShell
      title="객체별 3종 메트릭 시뮬레이터"
      subtitle="차량·원통 자재·하행 계단을 거리·회전 슬라이더로 조작해, 각 객체가 실제 판별식으로 SAFE→WARNING→DANGER를 어떻게 넘는지 확인해 보세요."
      hint="실제 저장소의 판별식·임계값(차량 높이 +50%/+200%, 자재 단면 ×1.1/×1.35 3프레임, 계단 소실점 기준선·밑변 y≥633)만 추출해 프론트에서 재현했습니다 — CV 추론은 하지 않습니다. 세 판별식 모두 '다음 단계로만 올라가는' 단방향 상태 머신이라, 한 번 오른 등급은 리셋 전까지 유지됩니다(실제로는 객체가 일정 시간 사라지면 SAFE로 리셋). 원통·계단의 '연속 프레임' 조건은 임계 이상을 잠깐 유지해야 등급이 오르는 히스테리시스로 재현했습니다."
      onReset={reset}
    >
      {/* 객체 탭 */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {OBJECTS.map(({ k, label, Icon }) => {
          const on = active === k
          const sev = machine[k].s
          return (
            <button
              key={k}
              onClick={() => setActive(k)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors ${
                on ? 'bg-black text-white' : 'border border-black/15 text-gray-600 hover:border-black'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: SEV[sev].c }}
                aria-label={SEV[sev].ko}
              />
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 카메라(스키매틱) 뷰 */}
        <div className="lg:w-[46%]">
          <div className="mx-auto max-w-[380px] overflow-hidden rounded-2xl border border-black/10 bg-slate-50">
            <svg viewBox={`0 0 ${CW} ${CH}`} className="block h-auto w-full">
              <defs>
                <pattern id="scGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0V40" fill="none" stroke="#000" strokeOpacity="0.04" strokeWidth="1" />
                </pattern>
              </defs>
              <rect x="0" y="0" width={CW} height={CH} fill="url(#scGrid)" />

              {active === 'vehicle' && <VehicleView height={vHeight} sev={machine.vehicle.s} />}
              {active === 'material' && <MaterialView dia={mDia} long={mLong} sev={machine.material.s} />}
              {active === 'stairs' && (
                <StairsView cy={sCy} vp={sVp} ref_y={sRef} desc={sDescending} sev={machine.stairs.s} />
              )}

              {/* 캡처 배지 */}
              <g transform="translate(16 20)">
                <rect x="0" y="0" width="176" height="26" rx="13" fill="#000" fillOpacity="0.6" />
                <text x="14" y="17" fill="#fff" fontSize="12" fontWeight="500">
                  스키매틱 · 실 CV 아님
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* 컨트롤 + 판정 */}
        <div className="flex-1">
          {/* 판정 배너 */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active + curSev}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${SEV[curSev].bg} ${SEV[curSev].bd}`}
            >
              <div>
                <p className="text-[11px] tracking-widest text-gray-400">현재 판정</p>
                <p className={`text-lg font-medium ${SEV[curSev].tx}`}>{SEV[curSev].ko}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] tracking-widest text-gray-400">Risk Code</p>
                <p className={`text-2xl font-light tabular-nums ${SEV[curSev].tx}`}>
                  {codes[active]}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 객체별 컨트롤 */}
          <div className="mt-5 space-y-5">
            {active === 'vehicle' && (
              <>
                <SliderRow
                  label="차량 접근"
                  right={`≈ ${vDist.toFixed(1)}m`}
                  value={vApp}
                  onChange={setVApp}
                  from="멀리"
                  to="가까이"
                />
                <MetricGrid
                  items={[
                    { k: '박스 높이', v: `${Math.round(vHeight)}px`, sub: `baseline ${V_BASE_H}px` },
                    {
                      k: '높이 증가율',
                      v: `+${Math.round(vInc * 100)}%`,
                      sub: `(h−h₀)/h₀`,
                      accent: vInc > V_DANGER ? 'DANGER' : vInc > V_WARN ? 'WARNING' : undefined,
                    },
                  ]}
                />
                <ThresholdBar
                  rows={[
                    { label: 'WARNING', at: '+50%', hit: vInc > V_WARN },
                    { label: 'DANGER', at: '+200%', hit: vInc > V_DANGER },
                  ]}
                />
                <p className="text-xs leading-relaxed text-gray-500">
                  차량을 처음 본 순간의 박스 높이를 baseline으로 고정하고, 이후 높이가 얼마나 커졌는지를
                  비율로 봅니다. 다가올수록 박스가 커져 증가율이 곧 접근도입니다 — <strong>+50%</strong>에서
                  경고, <strong>+200%(=3배)</strong>에서 위험.
                </p>
              </>
            )}

            {active === 'material' && (
              <>
                <SliderRow
                  label="자재 접근"
                  right={`≈ ${mDist.toFixed(1)}m`}
                  value={mApp}
                  onChange={setMApp}
                  from="멀리"
                  to="가까이"
                />
                <SliderRow
                  label="자재 회전"
                  right={`${Math.round(mRot)}°`}
                  value={mRot}
                  min={0}
                  max={90}
                  onChange={setMRot}
                  from="정면"
                  to="기울임"
                />
                <MetricGrid
                  items={[
                    {
                      k: '짧은 변 · 판정값',
                      v: `${Math.round(mDia)}px`,
                      sub: `단면 지름 (회전 불변)`,
                    },
                    { k: '긴 변', v: `${Math.round(mLong)}px`, sub: `회전 영향 · 판정 제외` },
                    {
                      k: 'size / baseline',
                      v: `×${mRatio.toFixed(2)}`,
                      sub: `baseline ${M_BASE_D}px`,
                      accent:
                        mRatio >= M_SECOND ? 'DANGER' : mRatio >= M_FIRST ? 'WARNING' : undefined,
                    },
                  ]}
                />
                <FrameProgress
                  sev={machine.material.s}
                  cw={machine.material.cw}
                  cd={machine.material.cd}
                  need={M_FRAMES}
                />
                <ThresholdBar
                  rows={[
                    { label: 'WARNING', at: '×1.10 · 3프레임', hit: mRatio >= M_FIRST },
                    { label: 'DANGER', at: '×1.35 · 3프레임', hit: mRatio >= M_SECOND },
                  ]}
                />
                <p className="text-xs leading-relaxed text-gray-500">
                  원통은 기울어져 보여도 되므로 축(긴 변)이 아니라 <strong>짧은 변(단면 지름)</strong>을
                  크기로 씁니다. 회전 슬라이더를 움직이면 <strong>긴 변만</strong> 변하고 판정값인 짧은 변은
                  그대로임을 확인해 보세요. 임계 초과가 <strong>3프레임 연속</strong>이어야 등급이 올라
                  순간 노이즈 오탐을 막습니다.
                </p>
              </>
            )}

            {active === 'stairs' && (
              <>
                <SliderRow
                  label="고개 숙임"
                  right={`소실점 y ${Math.round(sVp)}`}
                  value={sPitch}
                  onChange={setSPitch}
                  from="위 · 상행"
                  to="아래 · 하행"
                />
                <SliderRow
                  label="계단 접근"
                  right={`밑변 y ${Math.round(sCy)}`}
                  value={sApp}
                  onChange={setSApp}
                  from="멀리"
                  to="가까이"
                />
                <MetricGrid
                  items={[
                    {
                      k: '방향 판정',
                      v: sDescending ? '하행' : '상행',
                      sub: `소실점 ${sDescending ? '>' : '≤'} 기준선`,
                      accent: sDescending ? 'WARNING' : undefined,
                    },
                    { k: '하행 점수', v: `${machine.stairs.score} / ${S_SCORE_WARN}`, sub: `+1/−1 누적` },
                    {
                      k: '밑변 y',
                      v: `${Math.round(sCy)}`,
                      sub: `위험 ≥ ${S_BOTTOM_DANGER}`,
                      accent: sCy >= S_BOTTOM_DANGER ? 'DANGER' : undefined,
                    },
                  ]}
                />
                <ThresholdBar
                  rows={[
                    { label: 'WARNING', at: `하행점수 ≥ ${S_SCORE_WARN}`, hit: machine.stairs.score >= S_SCORE_WARN },
                    { label: 'DANGER', at: `밑변 y ≥ ${S_BOTTOM_DANGER}`, hit: sCy >= S_BOTTOM_DANGER },
                  ]}
                />
                <p className="text-xs leading-relaxed text-gray-500">
                  계단 사다리꼴의 양쪽 빗변을 연장한 <strong>소실점</strong>이 기준선보다 아래면 하행으로
                  보고 점수를 +1 합니다(위면 −1). 점수가 <strong>2</strong> 이상 쌓이면 하행 계단으로 확정해
                  경고하고, 밑변이 화면 바닥(<strong>y≥{S_BOTTOM_DANGER}</strong>)까지 내려오거나 1차 경고 대비
                  +50px 더 내려오면 위험. 상행 계단은 항상 안전입니다.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Risk Code 종합 패널 */}
      <div className="mt-6 rounded-2xl border border-black/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-widest text-gray-400">최종 RISK CODE (0~10)</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span
                className="text-4xl font-light tabular-nums"
                style={{ color: finalCode === 0 ? '#10b981' : SEV[finalCode >= 1 && finalCode % 3 === 2 ? 'DANGER' : 'WARNING'].c }}
              >
                {finalCode}
              </span>
              <span className="text-sm text-gray-500">{CODE_LABELS[finalCode]}</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {OBJECTS.map(({ k, label }) => (
              <div
                key={k}
                className={`rounded-xl border px-3 py-2 ${
                  codes[k] === finalCode && finalCode > 0 ? `${SEV[machine[k].s].bg} ${SEV[machine[k].s].bd}` : 'border-black/10'
                }`}
              >
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className="text-lg font-light tabular-nums" style={{ color: SEV[machine[k].s].c }}>
                  {codes[k]}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 border-t border-black/5 pt-3 text-xs leading-relaxed text-gray-500">
          하나의 정수로 <strong>무엇이</strong>(자재 0· 낙상 3· 차량 6) + <strong>얼마나</strong>(경고 +1·
          위험 +2)를 함께 인코딩하고, 세 객체 중 최댓값을 대표 코드로 씁니다. 각 객체를 조작해 어떤 위험이
          최종 코드를 가져가는지 확인해 보세요.
        </p>
      </div>
    </ExperienceShell>
  )
}

// ── 카메라 뷰: 차량 ──────────────────────────────────────────────────────────
function VehicleView({ height, sev }: { height: number; sev: Sev }) {
  const c = SEV[sev].c
  const groundY = 560
  const h = Math.min(height, 520)
  const bw = Math.min(h * 1.5, 460)
  const top = groundY - h
  const bx = CX - bw / 2
  // baseline 고스트
  const gh = V_BASE_H
  const gw = gh * 1.5
  return (
    <>
      <line x1="30" y1={groundY} x2={CW - 30} y2={groundY} stroke="#000" strokeOpacity="0.12" strokeWidth="2" />
      {/* baseline 고스트 박스 */}
      <rect
        x={CX - gw / 2}
        y={groundY - gh}
        width={gw}
        height={gh}
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <text x={CX + gw / 2 + 6} y={groundY - gh / 2} fill="#94a3b8" fontSize="12">
        baseline
      </text>
      {/* 차량 실루엣 */}
      <g>
        <rect x={bx} y={top + h * 0.32} width={bw} height={h * 0.68} rx={Math.min(14, h * 0.08)} fill={c} fillOpacity="0.14" />
        <rect
          x={bx + bw * 0.16}
          y={top}
          width={bw * 0.68}
          height={h * 0.42}
          rx={Math.min(12, h * 0.06)}
          fill={c}
          fillOpacity="0.14"
        />
        {/* 바퀴 */}
        <circle cx={bx + bw * 0.24} cy={groundY} r={Math.min(24, h * 0.11)} fill={c} fillOpacity="0.3" />
        <circle cx={bx + bw * 0.76} cy={groundY} r={Math.min(24, h * 0.11)} fill={c} fillOpacity="0.3" />
      </g>
      {/* AABB 바운딩 박스 */}
      <rect x={bx} y={top} width={bw} height={h} fill="none" stroke={c} strokeWidth="2.5" />
      {/* 높이 캘리퍼 */}
      <g stroke={c} strokeWidth="2">
        <line x1={bx - 16} y1={top} x2={bx - 16} y2={groundY} />
        <line x1={bx - 22} y1={top} x2={bx - 10} y2={top} />
        <line x1={bx - 22} y1={groundY} x2={bx - 10} y2={groundY} />
      </g>
      <text x={bx - 26} y={(top + groundY) / 2} fill={c} fontSize="13" fontWeight="600" textAnchor="end">
        {Math.round(height)}px
      </text>
    </>
  )
}

// ── 카메라 뷰: 원통 자재 ─────────────────────────────────────────────────────
function MaterialView({ dia, long, sev }: { dia: number; long: number; sev: Sev }) {
  const c = SEV[sev].c
  const cyc = CH / 2
  const d = Math.min(dia, 320)
  const L = long
  const left = CX - L / 2
  const right = CX + L / 2
  const top = cyc - d / 2
  const bot = cyc + d / 2
  return (
    <>
      {/* baseline 지름 고스트 (좌측 브래킷) */}
      <g stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4">
        <line x1="70" y1={cyc - M_BASE_D / 2} x2="70" y2={cyc + M_BASE_D / 2} />
      </g>
      <text x="58" y={cyc + M_BASE_D / 2 + 16} fill="#94a3b8" fontSize="11" textAnchor="middle">
        baseline
      </text>
      {/* 원통(캡슐) */}
      <rect x={left} y={top} width={L} height={d} rx={d / 2} fill={c} fillOpacity="0.14" />
      {/* minAreaRect 외곽 */}
      <rect x={left} y={top} width={L} height={d} fill="none" stroke={c} strokeWidth="2.5" strokeDasharray="7 5" />
      {/* 중심축(긴 변) */}
      <line x1={left + d / 2} y1={cyc} x2={right - d / 2} y2={cyc} stroke={c} strokeOpacity="0.4" strokeWidth="1.5" />

      {/* 짧은 변(판정값) 캘리퍼 — 우측 */}
      <g stroke={c} strokeWidth="2.5">
        <line x1={right + 18} y1={top} x2={right + 18} y2={bot} />
        <line x1={right + 12} y1={top} x2={right + 24} y2={top} />
        <line x1={right + 12} y1={bot} x2={right + 24} y2={bot} />
      </g>
      <text x={right + 28} y={cyc + 4} fill={c} fontSize="13" fontWeight="600">
        {Math.round(dia)}px
      </text>
      <text x={right + 28} y={cyc + 22} fill="#94a3b8" fontSize="11">
        짧은 변
      </text>
      {/* 긴 변 캘리퍼 — 하단 */}
      <g stroke={c} strokeWidth="1.5" strokeOpacity="0.6">
        <line x1={left} y1={bot + 22} x2={right} y2={bot + 22} />
        <line x1={left} y1={bot + 16} x2={left} y2={bot + 28} />
        <line x1={right} y1={bot + 16} x2={right} y2={bot + 28} />
      </g>
      <text x={CX} y={bot + 44} fill="#94a3b8" fontSize="12" textAnchor="middle">
        긴 변 {Math.round(long)}px (판정 제외)
      </text>
    </>
  )
}

// ── 카메라 뷰: 하행 계단 ─────────────────────────────────────────────────────
function StairsView({
  cy,
  vp,
  ref_y,
  desc,
  sev,
}: {
  cy: number
  vp: number
  ref_y: number
  desc: boolean
  sev: Sev
}) {
  const c = SEV[sev].c
  const blx = CX - S_HALF
  const brx = CX + S_HALF
  // 사다리꼴 상단(소실점 방향으로 수렴, 소실점까지 가지 않고 60% 지점)
  const tt = 0.62
  const tlx = lerp(blx, CX, tt)
  const trx = lerp(brx, CX, tt)
  const ty = lerp(cy, vp, tt)
  // 스텝 rung
  const rungs = [0.16, 0.34, 0.52].map((t) => ({
    lx: lerp(blx, CX, t),
    rx: lerp(brx, CX, t),
    y: lerp(cy, vp, t),
  }))
  const refDraw = clamp(ref_y, 6, CH - 6)
  return (
    <>
      {/* DANGER 라인 (y=633) */}
      <line x1="0" y1={S_BOTTOM_DANGER} x2={CW} y2={S_BOTTOM_DANGER} stroke="#ef4444" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="6 6" />
      <text x={CW - 10} y={S_BOTTOM_DANGER - 8} fill="#ef4444" fillOpacity="0.7" fontSize="11" textAnchor="end">
        위험선 y={S_BOTTOM_DANGER}
      </text>

      {/* 기준선 (reference_y) */}
      <line x1="0" y1={refDraw} x2={CW} y2={refDraw} stroke="#6366f1" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 5" />
      <text x="10" y={refDraw - 8} fill="#6366f1" fontSize="11">
        기준선 y={Math.round(ref_y)}
        {ref_y < 6 ? ' (화면 위)' : ''}
      </text>

      {/* 사다리꼴 면 */}
      <polygon
        points={`${blx},${cy} ${brx},${cy} ${trx},${ty} ${tlx},${ty}`}
        fill={c}
        fillOpacity="0.1"
        stroke={c}
        strokeWidth="2"
      />
      {/* 빗변 연장선 → 소실점 */}
      <line x1={blx} y1={cy} x2={CX} y2={vp} stroke={c} strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.7" />
      <line x1={brx} y1={cy} x2={CX} y2={vp} stroke={c} strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.7" />
      {/* 스텝 rung */}
      {rungs.map((r, i) => (
        <line key={i} x1={r.lx} y1={r.y} x2={r.rx} y2={r.y} stroke={c} strokeWidth="2" strokeOpacity="0.5" />
      ))}

      {/* 밑변 강조 */}
      <line x1={blx} y1={cy} x2={brx} y2={cy} stroke={c} strokeWidth="4" />
      <text x={brx + 8} y={cy + 4} fill={c} fontSize="12" fontWeight="600">
        밑변 {Math.round(cy)}
      </text>

      {/* 소실점 */}
      <circle cx={CX} cy={vp} r="6" fill={c} />
      <text x={CX + 12} y={vp + 4} fill={c} fontSize="12" fontWeight="600">
        소실점 {desc ? '(하행)' : '(상행)'}
      </text>
    </>
  )
}

// ── 공통 UI 조각 ─────────────────────────────────────────────────────────────
function SliderRow({
  label,
  right,
  value,
  onChange,
  min = 0,
  max = 100,
  from,
  to,
}: {
  label: string
  right: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  from: string
  to: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-xs tabular-nums text-gray-400">{right}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-black"
        aria-label={label}
      />
      <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </div>
  )
}

function MetricGrid({
  items,
}: {
  items: { k: string; v: string; sub?: string; accent?: Sev }[]
}) {
  return (
    <div className={`grid gap-2 ${items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {items.map((it) => (
        <div key={it.k} className="rounded-xl bg-gray-50 p-3">
          <p className="text-[10px] tracking-wide text-gray-400">{it.k}</p>
          <p
            className="mt-0.5 text-lg font-light tabular-nums"
            style={it.accent ? { color: SEV[it.accent].c } : undefined}
          >
            {it.v}
          </p>
          {it.sub && <p className="text-[10px] text-gray-400">{it.sub}</p>}
        </div>
      ))}
    </div>
  )
}

function ThresholdBar({ rows }: { rows: { label: string; at: string; hit: boolean }[] }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: r.hit ? (r.label === 'DANGER' ? SEV.DANGER.c : SEV.WARNING.c) : '#d1d5db' }}
          />
          <span className={r.hit ? 'font-medium text-gray-800' : 'text-gray-400'}>{r.label}</span>
          <span className="text-gray-400">임계 {r.at}</span>
          <span className="ml-auto text-gray-400">{r.hit ? '충족' : '미충족'}</span>
        </div>
      ))}
    </div>
  )
}

function FrameProgress({ sev, cw, cd, need }: { sev: Sev; cw: number; cd: number; need: number }) {
  // SAFE 상태에서는 WARNING 진행(cw), WARNING 상태에서는 DANGER 진행(cd)
  const isWarnPhase = sev === 'SAFE'
  const val = isWarnPhase ? cw : cd
  const target = isWarnPhase ? 'WARNING' : 'DANGER'
  const done = sev === 'DANGER'
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="text-gray-400">연속 프레임</span>
      <div className="flex gap-1">
        {Array.from({ length: need }).map((_, i) => (
          <span
            key={i}
            className="h-2 w-6 rounded-full"
            style={{ background: !done && i < val ? SEV.WARNING.c : '#e5e7eb' }}
          />
        ))}
      </div>
      <span className="tabular-nums text-gray-400">
        {done ? '—' : `${val}/${need} → ${target}`}
      </span>
    </div>
  )
}
