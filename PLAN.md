# 체험형 포트폴리오 페이지 — 개발 계획 (PLAN)

## 개요 (Context)
빈 그린필드 저장소(`Gangto326.github.io`)에서 시작한다. 저장소 이름이 `*.github.io`이므로
**GitHub User Pages**로 배포되어 루트 도메인 `https://gangto326.github.io/` 에서 서비스된다.

단순 프로젝트 소개를 넘어, 방문자가 직접 클릭·조작하며 각 프로젝트를 이해하는
**체험형 공간("Show Me")** 을 페이지 내에 직접 구현하는 것이 핵심 목표다. 총 **4개 프로젝트**.

## 확정된 결정 사항
| 항목 | 결정 |
|------|------|
| 기술 스택 | **React 18 + Vite + TypeScript** |
| 스타일/UI | **Tailwind 3 + shadcn/ui(new-york)** — `digital-agency/`(v0 Next.js 템플릿)에서 포팅. `@`→`src` 별칭 |
| 체험 방식 | 페이지 내 **인터랙티브 데모 직접 구현** (iframe 아님) |
| 디자인 | 미니멀 에이전시 톤(밝은 `#f8f8f8`·대문자 라이트체·그라디언트 블롭·rounded-full 아웃라인) 기준 확장 |
| 언어 | **한국어 전용** |
| 외부 링크 | 각 프로젝트 카드에 **GitHub 저장소 링크** |
| 콘텐츠 | 설명글 **초안은 내가 작성 → 사용자 수정**, 이미지는 플레이스홀더 후 교체 |
| 라우팅 | **HashRouter** (GH Pages 새로고침 404 방지, `#/project/:id`) |
| 배포 | **GitHub Actions** (`actions/deploy-pages`), Vite `base: '/'` |

## ⚠️ 구현 착수 전 필요한 입력 (사용자 제공 대기)
1. **4개 프로젝트 상세** — 각각 `프로젝트명 / 한 줄 소개 / 사용 기술 / 핵심 기능 / GitHub URL / 무엇을 체험시킬지`
2. **디자인 템플릿** — 루트 `/templates/` 에 저장 (메인·컴포넌트 기준 디자인)
> 아키텍처·스캐폴딩·디자인 시스템 뼈대(커밋 1~3)는 입력 없이 진행 가능.
> 프로젝트별 콘텐츠·체험 데모(커밋 4~)는 위 입력 확정 후 착수.

---

## 폴더 구조
```
/
├─ templates/                 # ★ 사용자 제공 원본 디자인 템플릿 (참고 소스)
├─ public/assets/projects/    # 프로젝트 스크린샷/로고 (플레이스홀더 → 교체)
├─ src/
│  ├─ main.jsx / App.jsx      # 라우팅 (HashRouter)
│  ├─ styles/tokens.css       # 템플릿에서 추출한 색·타이포·간격 토큰
│  ├─ styles/global.css
│  ├─ components/             # 공용 UI: Button, Card, Section, Tag, Nav, Footer
│  ├─ layout/                 # Header / Footer / PageLayout
│  ├─ sections/              # 메인: Hero, About, ProjectsGrid, Contact
│  ├─ data/projects.js        # 4개 프로젝트 메타데이터 (단일 진실 소스)
│  └─ experiences/            # ★ 프로젝트별 체험형 데모
│     ├─ ExperienceShell.jsx  # 공통 껍데기(제목·설명·리셋·조작 안내)
│     ├─ registry.js          # projectId → Experience 컴포넌트 매핑
│     └─ project1/ … project4/
├─ .github/workflows/deploy.yml
├─ vite.config.js             # base: '/'
└─ package.json
```

## 핵심 설계: 체험형 데모 모듈 패턴
- `data/projects.js`가 4개 프로젝트의 **단일 진실 소스**(제목/소개/기술배열/GitHub URL/체험 설명).
- 각 체험은 `ExperienceShell` 안에 마운트되는 **독립 React 컴포넌트**. `registry.js`가 projectId로 매핑.
- 흐름: 메인 `ProjectsGrid` → 카드 "체험하기" → `#/project/:id` 상세(설명 + GitHub 버튼 + 임베드 Experience).
- 데모가 서로 독립적이라 4개를 병렬 개발·교체 가능.

---

## 프로젝트 상세 & 확정된 체험형 데모
자료 출처: `docs/` (이력서, 사진, project1~4 각 PDF·마크다운). 데모는 모두 **백엔드 없이 프론트 시뮬레이션**.

### 1) OJO(오호) — 시각장애인 보행 보조 스마트 안경
- 스택: Python·FastAPI·SQLAlchemy·MySQL·Redis / PyTorch·ONNX·YOLOv11·MiDaS·MediaPipe / Kotlin·WearOS / RPi·Galaxy Watch
- 역할: 팀장 + AI·BE (6주, 6인) · GitHub: **미확보(요청 필요)**
- 하이라이트: 다중 AI 실시간 파이프라인(Eager 병렬+조건부 추론, 320→200→18ms), 깊이 기반 미학습 장애물 감지, LLM Pre-fetching(3.3→1.3s)
- **확정 데모: AI 파이프라인 시뮬레이터** — 순차/Eager병렬/조건부 모드 토글 → 3개 모델 실행 바 애니메이션 + 실시간 fps 카운터 (실측 수치 하드코딩)

### 2) LIDAR-Hyundai — 현대제철 미세먼지 라이다 관제 플랫폼
- 스택: Next.js16·React19·TS·Zustand·Tailwind / FastAPI(Py)+Spring Boot(Java) 폴리글랏 / PostgreSQL15+PostGIS·pg_partman·H3 / AWS EC2·S3
- 역할: BE·DB·Infra, 기여 60% (3개월, 2인) · GitHub: **`github.com/skybory/LIDAR-Hyundai`** (운영 samwoolidar.co.kr)
- 하이라이트: H3 Lv10 육각셀 사전집계+파티션 DROP으로 **저장 97%↓**, MULTIPOLYGON 디커플링+유클리드 근사(오차 0.1%), cell×area 도메인 분리
- **확정 데모: H3 격자 압축 시각화** — raw 점 수천 개 → 육각 셀 집계 → "20만 행→5,000 셀/−97%" 카운터 + 해상도 슬라이더

### 3) 똑똑캡(SmartCap) — 후방 위험 감지 스마트 안전모
- 스택: FastAPI·Python·Java·Spring Boot·JPA / PyTorch·YOLOv8-seg·ByteTrack·OpenCV(Homography) / PostgreSQL·Redis / React·Zustand·Recharts / ESP32-CAM
- 역할: BE·AI·DB·기획, 기여 17% (6주, 6인) · SSAFY 특화 우수상 1등 · GitHub: **미확보(요청 필요)**
- 하이라이트: 객체별 3종 메트릭(AABB높이/단면지름/소실점), Homography **1회 계산으로 3개 파이프라인 재사용**(낙상·수평보정·계단오탐, 연산 50%↓), 센서 대비 96% 경량화
- **확정 데모: 객체별 3종 메트릭 시뮬레이터** — 차량/파이프/계단을 거리·회전 슬라이더로 조작 → 판별식별 SAFE→WARNING→DANGER (기하 공식 재현, 실 CV 아님)

### 4) MODA(모다) — AI 콘텐츠 큐레이션 포탈
- 스택: Java17·Spring Boot3.4 / FastAPI·Ollama·SentenceTransformer / PostgreSQL·Elasticsearch(Nori)·Redis / Kotlin·Compose / Jenkins·FCM
- 역할: BE·DB·기획, 기여 17% (6주, 6인) · SSAFY 공통 우수상 1등 · GitHub: **미확보(요청 필요)**
- 하이라이트: Bulkhead 쓰레드풀 격리로 동시처리 3→10건·CPU피크 −77%, Netty 이벤트루프/트랜잭션 경계 제어, AFTER_COMMIT으로 ES-PG Ghost Data 차단
- **확정 데모: 쓰레드풀 고갈 Bulkhead 시뮬레이터** — 동시요청 슬라이더+Bulkhead ON/OFF → 공유풀 마비 vs 격리풀 정상응답 애니메이션

### 대기 입력
- **GitHub URL 3개**: OJO / 똑똑캡 / MODA
- **이미지(PNG/JPG)**: OJO(안경 착용·인식 화면), LIDAR(대시보드 히트맵), 똑똑캡(안전모 실물·감지 캡처 4컷), MODA(앱 3컷·로고) — 개발 진행하며 필요 시점에 요청
- **디자인 템플릿**: 루트 `/templates/` (커밋 3 착수 전 필요)

## 개발 순서 = Git 커밋 단위
> 각 커밋은 독립적으로 동작·검증 가능한 단위. 커밋 메시지는 `type: 요약` 형식.
> **작업 브랜치**: `main`에서 시작하므로, 실제 착수 시 `feat/portfolio-setup` 등 작업 브랜치를 먼저 만들고
> 커밋을 쌓은 뒤 사용자 확인 후 push/병합한다. **push는 사용자 승인 후에만 진행.**

| # | 커밋 | 내용 | 선행 입력 |
|---|------|------|----------|
| 1 | `chore: 프로젝트 스캐폴딩` | Vite+React 생성, 폴더 구조, `.gitignore`, `README` | 불필요 |
| 2 | `build: 라우팅·배포 설정` | HashRouter, `vite.config`(base `/`), GitHub Actions `deploy.yml`. **"Hello" 상태로 먼저 배포해 파이프라인 검증** | 불필요 |
| 3 | `feat: 디자인 시스템` | 템플릿 → `tokens.css` + 공용 컴포넌트(Button/Card/Section/Nav/Footer) + 레이아웃 | **템플릿** |
| 4 | `feat: 메인 페이지 섹션` | Hero / About / ProjectsGrid(4개 카드) / Contact + `data/projects.js` | **프로젝트 정보** |
| 5 | `feat: 체험 인프라` | `ExperienceShell`, `registry`, 프로젝트 상세 라우트(`#/project/:id`) | 프로젝트 정보 |
| 6 | `feat: 프로젝트1 체험 데모` | project1 인터랙티브 모듈 | 프로젝트1 상세 |
| 7 | `feat: 프로젝트2 체험 데모` | project2 인터랙티브 모듈 | 프로젝트2 상세 |
| 8 | `feat: 프로젝트3 체험 데모` | project3 인터랙티브 모듈 | 프로젝트3 상세 |
| 9 | `feat: 프로젝트4 체험 데모` | project4 인터랙티브 모듈 | 프로젝트4 상세 |
| 10 | `feat: 콘텐츠 초안` | 프로젝트 설명글 초안, 이미지 플레이스홀더 | 프로젝트 정보 |
| 11 | `polish: 반응형·접근성·성능` | 모바일/태블릿 반응형, 키보드·alt·대비, 코드 스플릿·이미지 최적화 | — |
| 12 | `release: 최종 배포 검증` | 배포 확인 및 마감 | — |

## 검증 방법
- **로컬**: `npm run dev`로 메인·상세·체험 동작, `#/project/:id` 새로고침 딥링크 확인.
- **빌드**: `npm run build && npm run preview` 무오류.
- **배포**: Actions 성공 → `https://gangto326.github.io/` 접속, 4개 체험 데모 조작,
  GitHub 링크 이동, 모바일 반응형, Lighthouse(성능/접근성) 점검.
