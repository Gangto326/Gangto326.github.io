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

// ── 원통 자재: minAreaRect 짧은 변(단면 지름) ────────────────────────────────
// 실제 저장소 로직 = cv2.minAreaRect(mask)의 shorter_side = min(w,h). 이는 투영된
// 실루엣 전체의 최소외접회전사각형 짧은 변으로, 파이프가 카메라 쪽으로 스윙하면
// 가까워진 끝의 단면이 굵어져 값이 커진다("가장 굵게 보이는 단면 지름"). AABB 대신
// minAreaRect를 쓰는 이유는 파이프가 화면에서 비스듬히(roll) 놓여도 지름을 정확히
// 재기 위함. baseline(정지·원거리) 대비 비율로 접근을 판정한다.
export const MAT = { zf: -11, zn: -4.2, R: 0.5, L: 4, roll: rad(18), yawMax: 60 }
export const materialZ = (app: number) => lerp(MAT.zf, MAT.zn, app / 100)

// 볼록껍질(모노톤 체인)
function convexHull(pts: Pt[]): Pt[] {
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y)
  const n = p.length
  if (n < 3) return p
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lo: Pt[] = []
  for (const q of p) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop()
    lo.push(q)
  }
  const up: Pt[] = []
  for (let i = n - 1; i >= 0; i--) {
    const q = p[i]
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop()
    up.push(q)
  }
  lo.pop()
  up.pop()
  return lo.concat(up)
}

// 최소외접회전사각형 (rotating calipers): 짧은 변·긴 변·4모서리
function minAreaRect(pts: Pt[]): { short: number; long: number; rect: Pt[] } {
  const h = convexHull(pts)
  let best = { area: Infinity, short: 0, long: 0, rect: pts.slice(0, 4) }
  for (let i = 0; i < h.length; i++) {
    const p1 = h[i]
    const p2 = h[(i + 1) % h.length]
    const L = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1
    const ux = (p2.x - p1.x) / L
    const uy = (p2.y - p1.y) / L
    const vx = -uy
    const vy = ux
    let u0 = Infinity
    let u1 = -Infinity
    let v0 = Infinity
    let v1 = -Infinity
    for (const p of h) {
      const du = (p.x - p1.x) * ux + (p.y - p1.y) * uy
      const dv = (p.x - p1.x) * vx + (p.y - p1.y) * vy
      u0 = Math.min(u0, du)
      u1 = Math.max(u1, du)
      v0 = Math.min(v0, dv)
      v1 = Math.max(v1, dv)
    }
    const w = u1 - u0
    const ht = v1 - v0
    const area = w * ht
    if (area < best.area) {
      const c = (u: number, v: number): Pt => ({ x: p1.x + u * ux + v * vx, y: p1.y + u * uy + v * vy })
      best = {
        area,
        short: Math.min(w, ht),
        long: Math.max(w, ht),
        rect: [c(u0, v0), c(u1, v0), c(u1, v1), c(u0, v1)],
      }
    }
  }
  return best
}

// 원통 축(roll 고정 + yaw 회전 슬라이더)과 두 캡 원의 표본점을 투영
function cylinderPoints(app: number, yawDeg: number): Pt[] {
  const zc = materialZ(app)
  const th = rad(yawDeg)
  const ph = MAT.roll
  // X축 원통을 yaw(Y축)→roll(Z=시선축) 회전한 축 방향
  const ax: [number, number, number] = [Math.cos(th) * Math.cos(ph), Math.cos(th) * Math.sin(ph), -Math.sin(th)]
  // 축에 수직인 정규직교 기저 U, V
  const a: [number, number, number] = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
  const uRaw: [number, number, number] = [a[1] * ax[2] - a[2] * ax[1], a[2] * ax[0] - a[0] * ax[2], a[0] * ax[1] - a[1] * ax[0]]
  const ul = Math.hypot(uRaw[0], uRaw[1], uRaw[2]) || 1
  const U: [number, number, number] = [uRaw[0] / ul, uRaw[1] / ul, uRaw[2] / ul]
  const V: [number, number, number] = [ax[1] * U[2] - ax[2] * U[1], ax[2] * U[0] - ax[0] * U[2], ax[0] * U[1] - ax[1] * U[0]]
  const N = 28
  const pts: Pt[] = []
  for (const s of [-1, 1]) {
    const cc: [number, number, number] = [(ax[0] * s * MAT.L) / 2, (ax[1] * s * MAT.L) / 2, zc + (ax[2] * s * MAT.L) / 2]
    for (let k = 0; k < N; k++) {
      const t = (2 * Math.PI * k) / N
      pts.push(
        project(
          CAM_M,
          cc[0] + MAT.R * (Math.cos(t) * U[0] + Math.sin(t) * V[0]),
          cc[1] + MAT.R * (Math.cos(t) * U[1] + Math.sin(t) * V[1]),
          cc[2] + MAT.R * (Math.cos(t) * U[2] + Math.sin(t) * V[2]),
        ),
      )
    }
  }
  return pts
}

export interface MatMeas {
  short: number // 판정값 = minAreaRect 짧은 변(가장 굵게 보이는 단면 지름)
  long: number
  rect: Pt[]
  shortEdge: [Pt, Pt] // 짧은 변 캘리퍼용
}
export function measureMaterial(app: number, yawDeg: number): MatMeas {
  const { short, long, rect } = minAreaRect(cylinderPoints(app, yawDeg))
  const e01 = Math.hypot(rect[1].x - rect[0].x, rect[1].y - rect[0].y)
  const e12 = Math.hypot(rect[2].x - rect[1].x, rect[2].y - rect[1].y)
  const shortEdge: [Pt, Pt] = e01 <= e12 ? [rect[0], rect[1]] : [rect[1], rect[2]]
  return { short, long, rect, shortEdge }
}
export const MAT_BASE_SHORT = measureMaterial(0, 0).short

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

// 위험(2단계) 임계 리매핑: 기본 투영에선 밑변이 화면 바닥(634)까지 내려와야 위험이라
// 너무 가까워야 발동한다. 사용자 요청대로, 실제 투영 밑변 y가 550이 되는 시점을 위험
// 임계(634)로 보도록 cy를 게인 스케일해 리포트한다. 오버레이 위험선도 이 실좌표에 맞춘다.
export const STAIR_DANGER_CY = Math.round(IMG_H * 0.99) // 634 (리포트 임계)
const STAIR_DANGER_TRIGGER_REAL = 550 // 실제 투영 밑변 y가 이 값이면 위험
const S_CY_GAIN = STAIR_DANGER_CY / STAIR_DANGER_TRIGGER_REAL // ≈ 1.153
export const STAIR_DANGER_LINE_Y = STAIR_DANGER_TRIGGER_REAL // 오버레이 위험선(실좌표)

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
  const cy = cyPt.y * S_CY_GAIN // 위험 임계 리매핑(실 550 → 리포트 634)
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
