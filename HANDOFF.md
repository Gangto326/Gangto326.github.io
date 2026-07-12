# HANDOFF — 체험형 포트폴리오 (새 세션용 인수인계)

김강토님의 GitHub Pages 배포용 **체험형 포트폴리오**. 4개 프로젝트를 소개하고, 각 프로젝트의
핵심 원리를 방문자가 직접 조작하며 이해하는 **인터랙티브 데모("EXPERIENCE")**를 제공한다.
다음 작업은 **③ 똑똑캡 데모** 제작. (자세한 전체 계획은 `PLAN.md` 참고)

---

## 지금까지 진행 상황
- ✅ 스캐폴딩 · 배포 파이프라인 · 디자인 시스템
- ✅ 메인 랜딩(Hero/About/Projects/Contact) · 상세 페이지(개요→기능→트러블슈팅→회고→체험)
- ✅ **OJO** 데모 — 버스 Eager Evaluation 시퀀스 타임라인 (영상 임베드)
- ✅ **LIDAR** 데모 — H3 격자 압축 시각화(실데이터) + 실제 보간↔H3 지도 crossfade
- ⬜ **똑똑캡** 데모 — 객체별 3종 메트릭 시뮬레이터 ← **다음 작업**
- ⬜ **MODA** 데모 — 쓰레드풀 Bulkhead 시뮬레이터
- ⬜ 콘텐츠 마감 · 실제 배포 검증

## 기술 스택 / 구조
- **React 18 + Vite + TypeScript + Tailwind 3 + shadcn/ui**, 라우팅 HashRouter, 애니메이션 framer-motion
- `src/pages/` Home, ProjectDetail(`#/project/:id`) · `src/components/{layout,sections}` · `src/data/`
- **데모 패턴**: `src/experiences/registry.tsx` 가 `projectId → 컴포넌트` 매핑. 각 데모는
  `ExperienceShell`(제목·설명·리셋·hint 공통 껍데기)로 감싼다. 없는 항목은 상세페이지에서 "준비 중" placeholder.
- **데이터 단일 소스**: `src/data/projects.ts`(카드 메타), `src/data/projectContent.ts`(개요·기능·트러블슈팅·회고).
  트러블슈팅·회고 본문의 `**강조**` 마커는 ProjectDetail의 `emphasize()`가 굵게 렌더.

## 검증 / 개발 (매 변경마다)
```
npm run typecheck   # tsc --noEmit
npm run build       # vite build
npm run dev         # http://localhost:5173  (백그라운드로 이미 떠 있을 수 있음)
```
- TypeScript는 **7.x**. `baseUrl` 사용 불가(paths만), CSS 사이드이펙트 import는 `src/vite-env.d.ts` 필요.
- lucide-react v1에는 **브랜드 아이콘(Github) 없음** → `src/components/icons/GithubIcon.tsx` 인라인 사용.

## Git
- 작업 브랜치 **`feat/portfolio-setup`** (main 아님). 커밋 단위로 진행, **push는 사용자 승인 후에만**.
- 커밋 메시지 말미:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

## 중요 규칙 / 민감 사항 (B2B)
- **고객사명 노출 금지**: EXPERIENCE(데모) 설명·소스 주석에 "당진 현대제철" 등 넣지 말 것. "실제 라이다 데이터"로.
- LIDAR의 H3 압축을 언급하는 모든 곳에 **"고객사 구역 통계의 넓이 기반"** 명시 필수.
- `docs/` 는 **gitignore**(이력서에 개인정보(전화/주소) 포함). `digital-agency/`(원본 Next 템플릿)도 gitignore.
- 데모는 **외부 의존성/네트워크 없이 프론트 시뮬레이션**만. 수치는 DEMO_SPEC 실측 우선, 예시값은 "예시" 표기.
- 디자인 톤: 밝은 `#f8f8f8` · 미니멀 · 대문자 라이트체 · rounded-full. 데모 UI도 이 톤 유지.

## 자료 위치 & 에셋 처리 도구
- 각 프로젝트 자료: `docs/projectN/` (DEMO_SPEC.md, PDF, 마크다운). **똑똑캡 = `docs/project3/DEMO_SPEC.md`** (정독 필수).
- 이미지/영상 처리용 Python venv(ffmpeg·imageio·Pillow·h3 설치됨):
  `<scratchpad>/venv/bin/python` — 프레임 추출·이미지 크롭·리사이즈·h3 계산에 사용. (scratchpad 경로는 세션 시스템 프롬프트에 있음)
- 웹 에셋은 `public/assets/<project>/` 에 둔다(예: `public/assets/ojo/bus-demo.mp4`, `public/assets/lidar/*.png`).

## 다음: 똑똑캡 데모 — 객체별 3종 메트릭 시뮬레이터
`docs/project3/DEMO_SPEC.md` 의 "최소 재현 세트" 기준. 슬라이더로 조작 → SAFE→WARNING→DANGER 계산(실 CV 아님):
| 객체 | 입력(슬라이더) | 판정값 | SAFE→WARNING | WARNING→DANGER |
|---|---|---|---|---|
| 차량 | 거리→박스 높이 | (h−h₀)/h₀ | > 0.5 (+50%) | > 2.0 (+200%) |
| 원통 자재 | 거리→짧은 변, 회전→긴 변 | size/baseline | ≥ 1.1 (3프레임) | ≥ 1.35 또는 1차 대비 ≥ 1.25 (3프레임) |
| 하행 계단 | 회전→소실점 y, 거리→밑변 y | 소실점/밑변 위치 | 하행점수 ≥ 2 | 밑변 y ≥ 633(0.99×640) 또는 1차 대비 +50px |
- Risk Code(0~10): 자재 offset 0 · 낙상(계단) 3 · 차량 6 + 심각도(WARNING 1 / DANGER 2), 최댓값 표시.
- 회전 슬라이더 포인트: 파이프는 회전해도 **짧은 변(단면 지름) 불변**임을 보여주는 게 핵심.
- 실제 감지 캡처 4컷(car/pipe/계단) 이미지가 있으면 병치하면 좋음(현재 미보유 — 필요 시 사용자에게 요청).

## 대기 중(사용자에게 받을 것)
- OJO / 똑똑캡 / MODA **GitHub URL**(카드 버튼용, 데모엔 무관). LIDAR는 확보(`github.com/skybory/LIDAR-Hyundai`).
- 실제 배포: **main push 승인** + GitHub Settings→Pages→Source "GitHub Actions".
