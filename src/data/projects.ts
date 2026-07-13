export interface Project {
  id: string
  index: string // '01' ~ '04'
  name: string
  nameKo: string
  tagline: string
  role: string
  meta: string // 기간 · 인원 · 수상 등
  stack: string[]
  highlight: string
  /** 체험형 데모 제목 (상세 페이지에서 마운트) */
  experience: string
  github?: string
  /** Tailwind 그라디언트 클래스 (블롭/액센트용) */
  accent: string
  /** 대표 이미지 (BASE_URL 기준 상대 경로). 카드 배너·상세 히어로에 사용. 없으면 accent 그라디언트 폴백. */
  thumb?: string
}

export const projects: Project[] = [
  {
    id: 'ojo',
    index: '01',
    name: 'OJO',
    nameKo: '오호',
    tagline: '시각장애인 보행 보조 스마트 안경',
    role: 'AI · Backend · 팀장',
    meta: '2025 · 6주 · 6인',
    stack: ['FastAPI', 'PyTorch', 'AI', 'ONNX', 'WebSocket'],
    highlight: '다중 AI 실시간 파이프라인 · 깊이 기반 미학습 장애물 감지',
    experience: 'AI 파이프라인 시뮬레이터',
    github: 'https://github.com/Gangto326/OJO',
    accent: 'from-violet-400 via-fuchsia-300 to-pink-200',
    thumb: 'assets/ojo/hero.jpg',
  },
  {
    id: 'lidar',
    index: '02',
    name: 'LIDAR-Hyundai',
    nameKo: '현대제철 라이다 관제',
    tagline: '미세먼지 라이다 센서 관제 플랫폼',
    role: 'Backend · DB · Infra',
    meta: '2025–26 · 3개월 · 2인',
    stack: ['Spring Boot', 'FastAPI', 'PostGIS', 'H3', 'pg_partman'],
    highlight: '구역 통계 넓이 기준 H3 집계로 저장 약 98% 절감 · 실시간 히트맵',
    experience: 'H3 격자 압축 시각화',
    accent: 'from-sky-400 via-cyan-300 to-emerald-200',
  },
  {
    id: 'smartcap',
    index: '03',
    name: '똑똑캡',
    nameKo: 'SmartCap',
    tagline: '후방 위험 감지 스마트 안전모',
    role: 'Backend · AI · 기획',
    meta: '2025 · 6주 · 6인 · 우수상 1등',
    stack: ['YOLOv8-seg', 'OpenCV', 'Homography', 'ByteTrack', 'FastAPI'],
    highlight: '센서리스 낙상 감지 · Homography 1회로 3개 파이프라인',
    experience: '객체별 3종 메트릭 시뮬레이터',
    github: 'https://github.com/Gangto326/SmartCap',
    accent: 'from-amber-400 via-orange-300 to-yellow-200',
    thumb: 'assets/smartcap/hero.jpg',
  },
  {
    id: 'moda',
    index: '04',
    name: 'MODA',
    nameKo: '모다',
    tagline: 'AI 콘텐츠 큐레이션 포탈',
    role: 'Backend · DB · 기획',
    meta: '2025 · 6주 · 6인 · 우수상 1등',
    stack: ['Spring Boot', 'Elasticsearch', 'Redis', 'FastAPI', 'Ollama'],
    highlight: 'Bulkhead 격리로 동시처리 3→10건 · ES-PG 정합성 보장',
    experience: '쓰레드풀 Bulkhead 시뮬레이터',
    github: 'https://github.com/Gangto326/MODA',
    accent: 'from-rose-400 via-pink-300 to-orange-200',
    thumb: 'assets/moda/hero.jpg',
  },
]
