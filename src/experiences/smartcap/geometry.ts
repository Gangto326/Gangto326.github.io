import * as THREE from 'three'

/**
 * 똑똑캡 3종 메트릭의 "측정" 계층.
 *
 * three.js로 실제 3D 장면을 세우고, 객체의 특징점을 카메라로 투영해 CV 파이프라인이
 * 봤을 2D 값(박스 높이·단면 지름·소실점 y)을 계산한다. 슬라이더 입력만으로 완전히
 * 결정되는 순수 함수라, 같은 함수를 r3f 렌더(시각)와 상태 머신(판정) 양쪽에서 쓴다.
 *
 * 좌표계: 투영 결과는 실제 코드처럼 640 높이 기준 가상 이미지(600×640)로 매핑한다.
 * 카메라 파라미터(CAM)는 r3f <Canvas>의 카메라와 반드시 일치시켜, 3D 화면과 오버레이가
 * 픽셀 단위로 정렬되게 한다.
 */

export interface Pt {
  x: number
  y: number
}

export const IMG_W = 600
export const IMG_H = 640
const ASPECT = IMG_W / IMG_H
const rad = (d: number) => (d * Math.PI) / 180
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function mkCam(fov: number, pos: [number, number, number], rotX: number) {
  const c = new THREE.PerspectiveCamera(fov, ASPECT, 0.1, 50000)
  c.position.set(pos[0], pos[1], pos[2])
  c.rotation.set(rotX, 0, 0)
  c.updateMatrixWorld(true)
  c.updateProjectionMatrix()
  return c
}
function project(cam: THREE.PerspectiveCamera, x: number, y: number, z: number): Pt {
  const v = new THREE.Vector3(x, y, z).project(cam)
  return { x: (v.x * 0.5 + 0.5) * IMG_W, y: (1 - (v.y * 0.5 + 0.5)) * IMG_H }
}

// r3f <Canvas> 카메라와 공유하는 파라미터(측정 카메라와 동일해야 함)
// 차량 카메라는 차 지붕(y=1.5)보다 낮게(y=0.9) 두어, 접근 시 지붕이 위로 솟고 밑변이
// 아래로 내려오는 "지면 위에서 커지며 다가오는" 원근을 만든다(카메라가 지붕보다 높으면
// 지붕이 되레 내려가 아래쪽만 커지는 착시가 생김).
export const CAM = {
  vehicle: { fov: 42, position: [0, 0.9, 0] as [number, number, number], rotX: rad(-2) },
  material: { fov: 40, position: [0, 0, 0] as [number, number, number], rotX: 0 },
  stairs: { fov: 44, position: [0, 2.4, 6] as [number, number, number], rotX: rad(-14) },
}
const CAM_V = mkCam(CAM.vehicle.fov, CAM.vehicle.position, CAM.vehicle.rotX)
const CAM_M = mkCam(CAM.material.fov, CAM.material.position, CAM.material.rotX)
const CAM_S = mkCam(CAM.stairs.fov, CAM.stairs.position, CAM.stairs.rotX)

// ── 차량: AABB 높이 (원근에 따라 커짐) ───────────────────────────────────────
export const VEH = { yaw: rad(22), zf: -26, zn: -6.5, hw: 1.0, y0: 0, y1: 1.5, hl: 2.0 }
export const vehicleZ = (app: number) => lerp(VEH.zf, VEH.zn, app / 100)

export interface VehMeas {
  corners: Pt[]
  aabb: { minX: number; minY: number; maxX: number; maxY: number }
  h: number
}
export function measureVehicle(app: number): VehMeas {
  const zc = vehicleZ(app)
  const cy = Math.cos(VEH.yaw)
  const sy = Math.sin(VEH.yaw)
  const corners: Pt[] = []
  let minX = 1e9
  let minY = 1e9
  let maxX = -1e9
  let maxY = -1e9
  for (const sx of [-VEH.hw, VEH.hw])
    for (const yy of [VEH.y0, VEH.y1])
      for (const sz of [-VEH.hl, VEH.hl]) {
        const x = cy * sx + sy * sz
        const z = -sy * sx + cy * sz
        const p = project(CAM_V, x, yy, zc + z)
        corners.push(p)
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
  return { corners, aabb: { minX, minY, maxX, maxY }, h: maxY - minY }
}
export const VEH_BASE_H = measureVehicle(0).h

// ── 원통 자재: 짧은 변(단면 지름) — 회전 불변 ────────────────────────────────
export const MAT = { zf: -13, zn: -3.5, R: 0.5, L: 3 }
export const materialZ = (app: number) => lerp(MAT.zf, MAT.zn, app / 100)

export interface MatMeas {
  dia: number
  len: number
  rect: Pt[]
  shortA: Pt
  shortB: Pt
}
export function measureMaterial(app: number, rotDeg: number): MatMeas {
  const zc = materialZ(app)
  const th = rad(rotDeg)
  // X축(수평)으로 누운 원통을 Y축 기준 회전 → 축 방향
  const ax: [number, number, number] = [Math.cos(th), 0, -Math.sin(th)]
  // 단면 지름: 축 중심의 위/아래 rim (Y축 회전으로 불변)
  const shortA = project(CAM_M, 0, MAT.R, zc)
  const shortB = project(CAM_M, 0, -MAT.R, zc)
  const dia = Math.abs(shortB.y - shortA.y)
  // 긴 변: 양쪽 캡 중심 (회전할수록 단축)
  const cA = project(CAM_M, (ax[0] * MAT.L) / 2, 0, zc + (ax[2] * MAT.L) / 2)
  const cB = project(CAM_M, (-ax[0] * MAT.L) / 2, 0, zc - (ax[2] * MAT.L) / 2)
  const len = Math.hypot(cA.x - cB.x, cA.y - cB.y)
  // minAreaRect 4모서리(캡중심 ± 반지름)
  const rect: Pt[] = [
    project(CAM_M, (ax[0] * MAT.L) / 2, MAT.R, zc + (ax[2] * MAT.L) / 2),
    project(CAM_M, (ax[0] * MAT.L) / 2, -MAT.R, zc + (ax[2] * MAT.L) / 2),
    project(CAM_M, (-ax[0] * MAT.L) / 2, -MAT.R, zc - (ax[2] * MAT.L) / 2),
    project(CAM_M, (-ax[0] * MAT.L) / 2, MAT.R, zc - (ax[2] * MAT.L) / 2),
  ]
  return { dia, len, rect, shortA, shortB }
}
export const MAT_BASE_D = measureMaterial(0, 0).dia

// ── 하행 계단: 소실점 Y ──────────────────────────────────────────────────────
export const STAIR = {
  riseUp: 0.42, // 상행(SAFE): 계단이 멀어질수록 올라감
  riseDown: -0.42, // 하행(WARNING): 멀어질수록 내려감
  depth: 0.95,
  gy: 0.15, // 가장 가까운 계단코 높이
  gzFar: -2.5,
  gzNear: 3.3,
  N: 8,
  halfW: 1.5,
}
export const stairRise = (pitch: number) => lerp(STAIR.riseUp, STAIR.riseDown, pitch / 100)
export const stairGz = (app: number) => lerp(STAIR.gzFar, STAIR.gzNear, app / 100)

/**
 * 기준선 = 카메라의 참 지평선(수평 전방 = rise 0인 평면의 소실점) + 소량 여유(eps).
 *
 * 스펙의 문자열 공식 reference_y = cy − 484.6(= 320 + 287·sin35°)은 실제 카메라의
 * 내부/외부 파라미터에 맞춰 지평선을 근사한 값이라, 데모의 합성 카메라에는 그대로 쓰면
 * 어긋난다(약한 상행도 하행으로 오판). 데모에서는 기하학적으로 정확한 지평선을 기준선으로
 * 써서 "소실점이 지평선보다 아래면 하행" 규칙(포트폴리오 원본)을 그대로 만족시킨다.
 * → 하행 판정이 계단 실제 기울기(rise)와 정확히 일치: 상행(rise≥0)은 접근해도 항상 SAFE.
 */
const STAIR_HORIZON_Y = project(CAM_S, 0, 0, -1e6).y
export const STAIR_REF_Y = STAIR_HORIZON_Y + 4 // 정확히 평평(rise=0)은 상행쪽으로 두는 여유

export interface StairMeas {
  cy: number
  vp: Pt
  refY: number
  desc: boolean
  nearL: Pt
  nearR: Pt
  steps: { l: Pt; r: Pt }[]
}
export function measureStairs(pitch: number, app: number): StairMeas {
  const rs = stairRise(pitch)
  const gz = stairGz(app)
  const cyPt = project(CAM_S, 0, STAIR.gy, gz) // 가장 가까운 계단코 중심
  const cy = cyPt.y
  // 하행 방향(멀어지며 내려가는 축)의 소실점 = 그 방향 무한점의 상
  const dl = Math.hypot(rs, STAIR.depth)
  const d: [number, number, number] = [0, rs / dl, -STAIR.depth / dl]
  const vp = project(CAM_S, d[0] * 5000, STAIR.gy + d[1] * 5000, gz + d[2] * 5000)
  const steps: { l: Pt; r: Pt }[] = []
  for (let i = 0; i < STAIR.N; i++) {
    const y = STAIR.gy + rs * i
    const z = gz - STAIR.depth * i
    steps.push({ l: project(CAM_S, -STAIR.halfW, y, z), r: project(CAM_S, STAIR.halfW, y, z) })
  }
  return {
    cy,
    vp,
    refY: STAIR_REF_Y,
    desc: vp.y > STAIR_REF_Y, // 소실점이 지평선 아래(y 큼) → 하행
    nearL: project(CAM_S, -STAIR.halfW, STAIR.gy, gz),
    nearR: project(CAM_S, STAIR.halfW, STAIR.gy, gz),
    steps,
  }
}
