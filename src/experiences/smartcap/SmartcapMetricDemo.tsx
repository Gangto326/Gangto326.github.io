import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Canvas } from '@react-three/fiber'
import { Car, Cylinder, StepForward } from 'lucide-react'
import { ExperienceShell } from '@/experiences/ExperienceShell'
import {
  CAM,
  IMG_H,
  IMG_W,
  MAT,
  MAT_BASE_SHORT,
  materialZ,
  measureMaterial,
  measureStairs,
  measureVehicle,
  STAIR,
  stairGz,
  stairRise,
  VEH,
  VEH_BASE_H,
  vehicleZ,
  type MatMeas,
  type Pt,
  type StairMeas,
  type VehMeas,
} from '@/experiences/smartcap/geometry'

/**
 * 똑똑캡 — 객체별 3종 메트릭 시뮬레이터 (실제 3D 투영).
 *
 * three.js로 차량·원통·계단을 실제 3D로 세우고(모두 내장 프리미티브, 외부 에셋·네트워크 0),
 * 카메라 투영으로 CV가 봤을 2D 값을 측정해 실제 저장소의 판별식·임계값으로 SAFE→WARNING→
 * DANGER 상태 머신을 굴린다. 측정은 geometry.ts의 순수 함수라 3D 화면·오버레이·판정이
 * 하나의 진실을 공유한다. smartcap 라우트만 lazy 로드되어 three.js 번들은 코드스플릿된다.
 */

type Sev = 'SAFE' | 'WARNING' | 'DANGER'
type ObjKey = 'vehicle' | 'material' | 'stairs'

const SEV: Record<Sev, { c: string; soft: string; ko: string; tx: string; bg: string; bd: string }> = {
  SAFE: { c: '#10b981', soft: '#6ee7b7', ko: '안전 · SAFE', tx: 'text-emerald-600', bg: 'bg-emerald-50', bd: 'border-emerald-200' },
  WARNING: { c: '#f59e0b', soft: '#fcd34d', ko: '주의 · WARNING', tx: 'text-amber-600', bg: 'bg-amber-50', bd: 'border-amber-200' },
  DANGER: { c: '#ef4444', soft: '#fca5a5', ko: '위험 · DANGER', tx: 'text-rose-600', bg: 'bg-rose-50', bd: 'border-rose-200' },
}

// 실제 저장소 임계값
const V_WARN = 0.5
const V_DANGER = 2.0
const M_FIRST = 1.1
const M_SECOND = 1.35
const M_SECOND_REL = 1.25
const M_FRAMES = 3
const S_SCORE_WARN = 2
const S_BOTTOM_DANGER = Math.round(IMG_H * 0.99) // 633
const S_BOTTOM_DELTA = 50

// 상태 머신
interface VState { s: Sev; vf: number }
interface MState { s: Sev; firstAlert: number; cw: number; cd: number }
interface SState { s: Sev; score: number; firstCy: number }
interface Machine { vehicle: VState; material: MState; stairs: SState }
const INIT: Machine = {
  vehicle: { s: 'SAFE', vf: 0 },
  material: { s: 'SAFE', firstAlert: MAT_BASE_SHORT, cw: 0, cd: 0 },
  stairs: { s: 'SAFE', score: 0, firstCy: 0 },
}

// Risk Code(0~10): 유형 오프셋 + 심각도
const CODE_OFFSET: Record<ObjKey, number> = { material: 0, stairs: 3, vehicle: 6 }
const CODE_LABELS = ['안전', '자재 주의', '자재 위험', '자재 사고', '낙상 주의', '낙상 위험', '낙상 사고', '차량 주의', '차량 위험', '차량 사고', '원인 불명']
const codeOf = (k: ObjKey, s: Sev) => (s === 'SAFE' ? 0 : CODE_OFFSET[k] + (s === 'WARNING' ? 1 : 2))

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const OBJECTS: { k: ObjKey; label: string; Icon: typeof Car }[] = [
  { k: 'vehicle', label: '차량', Icon: Car },
  { k: 'material', label: '원통 자재', Icon: Cylinder },
  { k: 'stairs', label: '하행 계단', Icon: StepForward },
]

const V_BASE = measureVehicle(0)
const M_BASE = measureMaterial(0, 0)

export function SmartcapMetricDemo() {
  const [active, setActive] = useState<ObjKey>('vehicle')
  const [machine, setMachine] = useState<Machine>(INIT)

  const [vApp, setVApp] = useState(0)
  const [mApp, setMApp] = useState(0)
  const [mRot, setMRot] = useState(0)
  const [sPitch, setSPitch] = useState(0)
  const [sApp, setSApp] = useState(0)

  // 프레임 틱이 최신 입력을 읽도록 ref 미러링
  const inRef = useRef({ vApp, mApp, mRot, sPitch, sApp })
  inRef.current = { vApp, mApp, mRot, sPitch, sApp }
  const activeRef = useRef(active)
  activeRef.current = active

  // 현재 슬라이더 기준 측정 (오버레이·지표용)
  const vMeas = measureVehicle(vApp)
  const mMeas = measureMaterial(mApp, mRot)
  const sMeas = measureStairs(sPitch, sApp)
  const vInc = (vMeas.h - VEH_BASE_H) / VEH_BASE_H
  const mRatio = mMeas.short / MAT_BASE_SHORT

  // 120ms 프레임 틱 — 활성 객체 상태 머신 갱신
  useEffect(() => {
    const id = setInterval(() => {
      const k = activeRef.current
      const i = inRef.current
      setMachine((prev) => {
        if (k === 'vehicle') {
          const inc = (measureVehicle(i.vApp).h - VEH_BASE_H) / VEH_BASE_H
          let { s, vf } = prev.vehicle
          vf = Math.min(vf + 1, 10)
          if (vf >= 2) {
            if (s === 'SAFE' && inc > V_WARN) s = 'WARNING'
            else if (s === 'WARNING' && inc > V_DANGER) s = 'DANGER'
          }
          return { ...prev, vehicle: { s, vf } }
        }
        if (k === 'material') {
          const dia = measureMaterial(i.mApp, i.mRot).short
          const ratio = dia / MAT_BASE_SHORT
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
        const st = measureStairs(i.sPitch, i.sApp)
        let { s, score, firstCy } = prev.stairs
        score = clamp(score + (st.desc ? 1 : -1), 0, 4)
        if (s === 'SAFE' && score >= S_SCORE_WARN) {
          s = 'WARNING'
          firstCy = st.cy
        } else if (s === 'WARNING') {
          if (st.cy >= S_BOTTOM_DANGER || st.cy >= firstCy + S_BOTTOM_DELTA) s = 'DANGER'
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

  const codes: Record<ObjKey, number> = {
    material: codeOf('material', machine.material.s),
    stairs: codeOf('stairs', machine.stairs.s),
    vehicle: codeOf('vehicle', machine.vehicle.s),
  }
  const finalCode = Math.max(codes.material, codes.stairs, codes.vehicle)
  const curSev = machine[active].s
  const cam = CAM[active]

  return (
    <ExperienceShell
      title="객체별 3종 메트릭 시뮬레이터"
      subtitle="차량·원통 자재·하행 계단을 3D로 조작해, 카메라가 본 값이 실제 판별식으로 SAFE→WARNING→DANGER를 어떻게 넘는지 확인해 보세요."
      hint="화면은 three.js 실제 3D 장면입니다 — 슬라이더로 움직인 객체를 카메라로 투영해 나온 2D 값(박스 높이·단면 지름·소실점 y)에 실제 저장소의 판별식·임계값(차량 +50%/+200%, 자재 단면 ×1.1/×1.35 3프레임, 계단 소실점 기준선·밑변 y≥633)을 그대로 적용합니다. 세 판별식 모두 단방향 상태 머신이라 한 번 오른 등급은 리셋 전까지 유지됩니다(실제로는 객체가 일정 시간 사라지면 SAFE로 리셋). 외부 에셋·네트워크 없이 정적으로 동작합니다."
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
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEV[sev].c }} aria-label={SEV[sev].ko} />
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* 3D 뷰 + 측정 오버레이 */}
        <div className="lg:w-[46%]">
          <div
            className="relative mx-auto max-w-[380px] overflow-hidden rounded-2xl border border-black/10 bg-slate-50"
            style={{ aspectRatio: `${IMG_W} / ${IMG_H}` }}
          >
            <Canvas
              key={active}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: true }}
              camera={{ fov: cam.fov, position: cam.position, near: 0.1, far: 50000 }}
              onCreated={({ camera }) => {
                camera.rotation.set(cam.rotX, 0, 0)
                camera.updateProjectionMatrix()
                camera.updateMatrixWorld(true)
              }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <ambientLight intensity={0.75} />
              <hemisphereLight args={['#ffffff', '#c8d0dc', 0.5]} />
              <directionalLight position={[4, 8, 6]} intensity={1.1} />
              {active === 'vehicle' && <VehicleModel app={vApp} color={SEV[machine.vehicle.s].c} />}
              {active === 'material' && <MaterialModel app={mApp} rot={mRot} color={SEV[machine.material.s].c} />}
              {active === 'stairs' && <StairsModel pitch={sPitch} app={sApp} color={SEV[machine.stairs.s].c} />}
            </Canvas>

            {/* 측정 주석 오버레이 */}
            <svg viewBox={`0 0 ${IMG_W} ${IMG_H}`} className="pointer-events-none absolute inset-0 h-full w-full">
              {active === 'vehicle' && <VehicleOverlay m={vMeas} color={SEV[machine.vehicle.s].c} />}
              {active === 'material' && <MaterialOverlay m={mMeas} color={SEV[machine.material.s].c} />}
              {active === 'stairs' && <StairsOverlay m={sMeas} color={SEV[machine.stairs.s].c} />}
            </svg>

            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
              3D 투영
            </span>
          </div>
        </div>

        {/* 컨트롤 + 판정 */}
        <div className="flex-1">
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
                <p className={`text-2xl font-light tabular-nums ${SEV[curSev].tx}`}>{codes[active]}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 space-y-5">
            {active === 'vehicle' && (
              <>
                <SliderRow label="차량 접근" right={`≈ ${(-vehicleZ(vApp)).toFixed(1)}m`} value={vApp} onChange={setVApp} from="멀리" to="가까이" />
                <MetricGrid
                  items={[
                    { k: '박스 높이', v: `${Math.round(vMeas.h)}px`, sub: `baseline ${Math.round(VEH_BASE_H)}px` },
                    { k: '높이 증가율', v: `+${Math.round(vInc * 100)}%`, sub: '(h−h₀)/h₀', accent: vInc > V_DANGER ? 'DANGER' : vInc > V_WARN ? 'WARNING' : undefined },
                  ]}
                />
                <ThresholdBar
                  rows={[
                    { label: 'WARNING', at: '+50%', hit: vInc > V_WARN },
                    { label: 'DANGER', at: '+200%', hit: vInc > V_DANGER },
                  ]}
                />
                <p className="text-xs leading-relaxed text-gray-500">
                  차량을 처음 본 순간의 박스 높이를 baseline으로 고정하고, 이후 카메라가 본 높이가 얼마나 커졌는지를 비율로 봅니다.
                  다가올수록 원근에 의해 박스가 커져 증가율이 곧 접근도입니다 — <strong>+50%</strong>에서 경고, <strong>+200%(=3배)</strong>에서 위험.
                </p>
              </>
            )}

            {active === 'material' && (
              <>
                <SliderRow label="자재 접근" right={`≈ ${(-materialZ(mApp)).toFixed(1)}m`} value={mApp} onChange={setMApp} from="멀리" to="가까이" />
                <SliderRow label="자재 회전 (끝단이 나를 향해)" right={`${Math.round(mRot)}°`} value={mRot} min={0} max={MAT.yawMax} onChange={setMRot} from="정면" to="스윙" />
                <MetricGrid
                  items={[
                    { k: '짧은 변 · 판정값', v: `${Math.round(mMeas.short)}px`, sub: 'minAreaRect 단면 지름' },
                    { k: '긴 변', v: `${Math.round(mMeas.long)}px`, sub: '파이프 길이 (투영)' },
                    { k: 'short / baseline', v: `×${mRatio.toFixed(2)}`, sub: `baseline ${Math.round(MAT_BASE_SHORT)}px`, accent: mRatio >= M_SECOND ? 'DANGER' : mRatio >= M_FIRST ? 'WARNING' : undefined },
                  ]}
                />
                <FrameProgress sev={machine.material.s} cw={machine.material.cw} cd={machine.material.cd} need={M_FRAMES} />
                <ThresholdBar
                  rows={[
                    { label: 'WARNING', at: '×1.10 · 3프레임', hit: mRatio >= M_FIRST },
                    { label: 'DANGER', at: '×1.35 · 3프레임', hit: mRatio >= M_SECOND },
                  ]}
                />
                <p className="text-xs leading-relaxed text-gray-500">
                  판정값은 실루엣의 <strong>최소외접회전사각형(minAreaRect) 짧은 변</strong> = 가장 굵게 보이는 단면 지름입니다.
                  <strong>회전 슬라이더</strong>로 파이프 끝단을 카메라 쪽으로 스윙하면, 축이 제자리에 있어도 가까워진 쪽 단면이 굵어져 짧은 변이 커집니다(접근 판정).
                  AABB 대신 minAreaRect를 쓰는 건 파이프가 비스듬히 놓여도 지름을 정확히 재기 위함입니다. 임계 초과가 <strong>3프레임 연속</strong>이어야 등급이 올라 노이즈 오탐을 막습니다.
                </p>
              </>
            )}

            {active === 'stairs' && (
              <>
                <SliderRow label="시선 (상행↔하행)" right={`소실점 y ${Math.round(clamp(sMeas.vp.y, -99, 999))}`} value={sPitch} onChange={setSPitch} from="위 · 상행" to="아래 · 하행" />
                <SliderRow label="계단 접근" right={`밑변 y ${Math.round(sMeas.cy)}`} value={sApp} onChange={setSApp} from="멀리" to="가까이" />
                <MetricGrid
                  items={[
                    { k: '방향 판정', v: sMeas.desc ? '하행' : '상행', sub: `소실점 ${sMeas.desc ? '>' : '≤'} 기준선`, accent: sMeas.desc ? 'WARNING' : undefined },
                    { k: '하행 점수', v: `${machine.stairs.score} / ${S_SCORE_WARN}`, sub: '+1/−1 누적' },
                    { k: '밑변 y', v: `${Math.round(sMeas.cy)}`, sub: `위험 ≥ ${S_BOTTOM_DANGER}`, accent: sMeas.desc && sMeas.cy >= S_BOTTOM_DANGER ? 'DANGER' : undefined },
                  ]}
                />
                <ThresholdBar
                  rows={[
                    { label: 'WARNING', at: `하행점수 ≥ ${S_SCORE_WARN}`, hit: machine.stairs.score >= S_SCORE_WARN },
                    // DANGER는 하행(WARNING) 상태가 전제 — 상행에선 밑변이 내려와도 위험이 아니다
                    { label: 'DANGER', at: `하행 + 밑변 y ≥ ${S_BOTTOM_DANGER}`, hit: sMeas.desc && sMeas.cy >= S_BOTTOM_DANGER },
                  ]}
                />
                <p className="text-xs leading-relaxed text-gray-500">
                  계단 빗변을 연장한 <strong>소실점</strong>이 기준선보다 아래면 하행으로 보고 점수를 +1 합니다(위면 −1).
                  시선 슬라이더로 계단을 상행↔하행으로 기울여 소실점이 기준선을 넘는 순간을 보세요. 점수가 <strong>2</strong> 이상이면
                  하행 확정·경고, 밑변이 화면 바닥(<strong>y≥{S_BOTTOM_DANGER}</strong>)까지 내려오거나 1차 경고 대비 +50px 더 내려오면 위험. 상행은 항상 안전.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Risk Code 종합 */}
      <div className="mt-6 rounded-2xl border border-black/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-widest text-gray-400">최종 RISK CODE (0~10)</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-light tabular-nums" style={{ color: finalCode === 0 ? SEV.SAFE.c : finalCode % 3 === 2 ? SEV.DANGER.c : SEV.WARNING.c }}>
                {finalCode}
              </span>
              <span className="text-sm text-gray-500">{CODE_LABELS[finalCode]}</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {OBJECTS.map(({ k, label }) => (
              <div key={k} className={`rounded-xl border px-3 py-2 ${codes[k] === finalCode && finalCode > 0 ? `${SEV[machine[k].s].bg} ${SEV[machine[k].s].bd}` : 'border-black/10'}`}>
                <p className="text-[10px] text-gray-400">{label}</p>
                <p className="text-lg font-light tabular-nums" style={{ color: SEV[machine[k].s].c }}>
                  {codes[k]}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 border-t border-black/5 pt-3 text-xs leading-relaxed text-gray-500">
          하나의 정수로 <strong>무엇이</strong>(자재 0· 낙상 3· 차량 6) + <strong>얼마나</strong>(경고 +1· 위험 +2)를 함께 인코딩하고,
          세 객체 중 최댓값을 대표 코드로 씁니다. 각 객체를 조작해 어떤 위험이 최종 코드를 가져가는지 확인해 보세요.
        </p>
      </div>
    </ExperienceShell>
  )
}

// ── 3D 모델 (내장 프리미티브) ────────────────────────────────────────────────
function VehicleModel({ app, color }: { app: number; color: string }) {
  const wheelY = 0.32
  const z = vehicleZ(app)
  return (
    <>
      {/* 지면 — 원근 그리드로 "지면 위" 느낌 부여 */}
      <gridHelper args={[90, 90, '#cbd5e1', '#e6ebf1']} position={[0, 0, -16]} />
      {/* 접지 그림자 */}
      <mesh position={[0, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.4, 40]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.14} />
      </mesh>
      <group position={[0, 0, z]} rotation={[0, VEH.yaw, 0]}>
        <mesh position={[0, 0.72, -0.1]}>
          <boxGeometry args={[2, 0.55, 3.6]} />
          <meshStandardMaterial color={color} roughness={0.55} metalness={0.05} />
        </mesh>
        <mesh position={[0, 1.18, -0.3]}>
          <boxGeometry args={[1.6, 0.5, 1.9]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
        </mesh>
        {[
          [0.85, 1.3],
          [-0.85, 1.3],
          [0.85, -1.3],
          [-0.85, -1.3],
        ].map(([x, zz], i) => (
          <mesh key={i} position={[x, wheelY, zz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.28, 24]} />
            <meshStandardMaterial color="#334155" roughness={0.7} />
          </mesh>
        ))}
      </group>
    </>
  )
}

function MaterialModel({ app, rot, color }: { app: number; rot: number; color: string }) {
  // 축 방향 = Rz(roll) · Ry(yaw) · X (geometry.cylinderPoints와 동일 합성).
  // 중첩 group: 바깥 roll(Z, 시선축 · 드라마틱 기운 포즈), 안 yaw(Y, 끝단 스윙), 원통 mesh는 X정렬.
  return (
    <group position={[0, 0, materialZ(app)]} rotation={[0, 0, MAT.roll]}>
      <group rotation={[0, (rot * Math.PI) / 180, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[MAT.R, MAT.R, MAT.L, 40]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
        </mesh>
      </group>
    </group>
  )
}

function StairsModel({ pitch, app, color }: { pitch: number; app: number; color: string }) {
  const rs = stairRise(pitch)
  const gz = stairGz(app)
  const riser = 0.5
  return (
    <group>
      {Array.from({ length: STAIR.N }).map((_, i) => {
        const y = STAIR.gy + rs * i
        const z = gz - STAIR.depth * i
        return (
          <mesh key={i} position={[0, y - riser / 2, z - STAIR.depth / 2]}>
            <boxGeometry args={[STAIR.halfW * 2, riser, STAIR.depth]} />
            <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
          </mesh>
        )
      })}
    </group>
  )
}

// ── 측정 오버레이 (주석만; 객체 자체는 3D가 그림) ────────────────────────────
function VehicleOverlay({ m, color }: { m: VehMeas; color: string }) {
  const { minX, minY, maxX, maxY } = m.aabb
  const b = V_BASE.aabb
  // 근접 시 박스가 프레임을 넘으므로 캘리퍼·라벨을 화면 안으로 클램프
  const calX = clamp(minX - 16, 12, IMG_W - 12)
  const y0 = clamp(minY, 3, IMG_H - 3)
  const y1 = clamp(maxY, 3, IMG_H - 3)
  const labelLeft = calX > 64
  return (
    <>
      {/* baseline 고스트 */}
      <rect x={b.minX} y={b.minY} width={b.maxX - b.minX} height={b.maxY - b.minY} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
      {/* AABB */}
      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="none" stroke={color} strokeWidth="2.5" />
      {/* 높이 캘리퍼 */}
      <g stroke={color} strokeWidth="2">
        <line x1={calX} y1={y0} x2={calX} y2={y1} />
        <line x1={calX - 6} y1={y0} x2={calX + 6} y2={y0} />
        <line x1={calX - 6} y1={y1} x2={calX + 6} y2={y1} />
      </g>
      <text x={labelLeft ? calX - 6 : calX + 8} y={clamp((y0 + y1) / 2, 14, IMG_H - 6)} fill={color} fontSize="13" fontWeight="600" textAnchor={labelLeft ? 'end' : 'start'}>
        {Math.round(maxY - minY)}px
      </text>
    </>
  )
}

function MaterialOverlay({ m, color }: { m: MatMeas; color: string }) {
  const pts = m.rect.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const [sa, sb] = m.shortEdge
  const mx = clamp((sa.x + sb.x) / 2 + 12, 8, IMG_W - 60)
  const my = clamp((sa.y + sb.y) / 2, 14, IMG_H - 18)
  const [ba, bb] = M_BASE.shortEdge
  return (
    <>
      {/* baseline 고스트(정지·원거리 짧은 변) */}
      <line x1={ba.x} y1={ba.y} x2={bb.x} y2={bb.y} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" />
      {/* minAreaRect */}
      <polygon points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="7 5" />
      {/* 짧은 변(판정값) */}
      <line x1={sa.x} y1={sa.y} x2={sb.x} y2={sb.y} stroke={color} strokeWidth="4" />
      <circle cx={sa.x} cy={sa.y} r="3" fill={color} />
      <circle cx={sb.x} cy={sb.y} r="3" fill={color} />
      <text x={mx} y={my} fill={color} fontSize="13" fontWeight="600">
        {Math.round(m.short)}px
      </text>
      <text x={mx} y={my + 17} fill="#64748b" fontSize="11">
        짧은 변
      </text>
    </>
  )
}

function StairsOverlay({ m, color }: { m: StairMeas; color: string }) {
  const refDraw = clamp(m.refY, 6, IMG_H - 6)
  const vpDraw = { x: clamp(m.vp.x, 10, IMG_W - 10), y: clamp(m.vp.y, 8, IMG_H - 8) }
  return (
    <>
      {/* 위험선 y=633 */}
      <line x1="0" y1={S_BOTTOM_DANGER} x2={IMG_W} y2={S_BOTTOM_DANGER} stroke="#ef4444" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="6 6" />
      <text x={IMG_W - 10} y={S_BOTTOM_DANGER - 8} fill="#ef4444" fillOpacity="0.75" fontSize="11" textAnchor="end">
        위험선 y={S_BOTTOM_DANGER}
      </text>
      {/* 기준선 */}
      <line x1="0" y1={refDraw} x2={IMG_W} y2={refDraw} stroke="#6366f1" strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="3 5" />
      <text x="10" y={refDraw - 8} fill="#6366f1" fontSize="11">
        기준선 y={Math.round(m.refY)}
        {m.refY < 6 ? ' (화면 위)' : ''}
      </text>
      {/* 빗변 연장선 → 소실점 */}
      <line x1={m.nearL.x} y1={m.nearL.y} x2={m.vp.x} y2={m.vp.y} stroke={color} strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.7" />
      <line x1={m.nearR.x} y1={m.nearR.y} x2={m.vp.x} y2={m.vp.y} stroke={color} strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.7" />
      {/* 스텝 코 라인 */}
      {m.steps.map((s, i) => (
        <line key={i} x1={s.l.x} y1={s.l.y} x2={s.r.x} y2={s.r.y} stroke={color} strokeWidth="1.5" strokeOpacity={i === 0 ? 0 : 0.4} />
      ))}
      {/* 밑변 강조 */}
      <line x1={m.nearL.x} y1={m.nearL.y} x2={m.nearR.x} y2={m.nearR.y} stroke={color} strokeWidth="4" />
      <text x={clamp(m.nearR.x + 8, 8, IMG_W - 66)} y={clamp(m.nearR.y + 4, 14, IMG_H - 6)} fill={color} fontSize="12" fontWeight="600">
        밑변 {Math.round(m.cy)}
      </text>
      {/* 소실점 */}
      <circle cx={vpDraw.x} cy={vpDraw.y} r="6" fill={color} />
      <text x={vpDraw.x + 12} y={vpDraw.y + 4} fill={color} fontSize="12" fontWeight="600">
        소실점 {m.desc ? '(하행)' : '(상행)'}
      </text>
    </>
  )
}

// ── 공통 UI ─────────────────────────────────────────────────────────────────
function SliderRow({ label, right, value, onChange, min = 0, max = 100, from, to }: { label: string; right: string; value: number; onChange: (v: number) => void; min?: number; max?: number; from: string; to: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-xs tabular-nums text-gray-400">{right}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-black" aria-label={label} />
      <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </div>
  )
}

function MetricGrid({ items }: { items: { k: string; v: string; sub?: string; accent?: Sev }[] }) {
  return (
    <div className={`grid gap-2 ${items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {items.map((it) => (
        <div key={it.k} className="rounded-xl bg-gray-50 p-3">
          <p className="text-[10px] tracking-wide text-gray-400">{it.k}</p>
          <p className="mt-0.5 text-lg font-light tabular-nums" style={it.accent ? { color: SEV[it.accent].c } : undefined}>
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
          <span className="h-2 w-2 rounded-full" style={{ background: r.hit ? (r.label === 'DANGER' ? SEV.DANGER.c : SEV.WARNING.c) : '#d1d5db' }} />
          <span className={r.hit ? 'font-medium text-gray-800' : 'text-gray-400'}>{r.label}</span>
          <span className="text-gray-400">임계 {r.at}</span>
          <span className="ml-auto text-gray-400">{r.hit ? '충족' : '미충족'}</span>
        </div>
      ))}
    </div>
  )
}

function FrameProgress({ sev, cw, cd, need }: { sev: Sev; cw: number; cd: number; need: number }) {
  const isWarnPhase = sev === 'SAFE'
  const val = isWarnPhase ? cw : cd
  const target = isWarnPhase ? 'WARNING' : 'DANGER'
  const done = sev === 'DANGER'
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span className="text-gray-400">연속 프레임</span>
      <div className="flex gap-1">
        {Array.from({ length: need }).map((_, i) => (
          <span key={i} className="h-2 w-6 rounded-full" style={{ background: !done && i < val ? SEV.WARNING.c : '#e5e7eb' }} />
        ))}
      </div>
      <span className="tabular-nums text-gray-400">{done ? '—' : `${val}/${need} → ${target}`}</span>
    </div>
  )
}
