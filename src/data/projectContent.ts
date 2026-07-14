/** 기능 미디어. 경로는 BASE_URL 기준 상대(assets/…). 없으면 "이미지 준비 중" 자리표시. */
export type FeatureMedia =
  | { kind: 'image'; src: string }
  | { kind: 'video'; src: string }
  | { kind: 'sequence'; srcs: string[]; interval?: number; ratio?: string }
  | { kind: 'montage'; srcs: string[] } // 여러 이미지를 옆으로 나란히

export interface Feature {
  title: string
  desc: string
  media?: FeatureMedia
}

export interface Troubleshooting {
  title: string
  problem: string
  solution: string
  result: string
}

export interface RetroPoint {
  heading: string
  body: string
}

export interface ProjectContent {
  overview: string
  features: Feature[]
  troubleshooting: Troubleshooting[]
  retrospective: RetroPoint[]
}

// 트러블슈팅·회고 본문의 **강조** 마커는 ProjectDetail의 emphasize()가 굵게 렌더링한다.
export const projectContent: Record<string, ProjectContent> = {
  ojo: {
    overview:
      '안경에 장착된 카메라와 다중 AI 모델로 시각장애인의 보행을 실시간 음성 안내하는 스마트 안경입니다. 장애물·횡단보도·버스·손에 쥔 물체를 인식하고, 스마트워치로 낙상까지 감지합니다. 6주간 6인 팀에서 팀장 겸 AI·백엔드를 맡았습니다.',
    features: [
      {
        title: '장애물 감지 / 회피',
        desc: 'YOLO와 깊이 추정을 결합해 학습하지 않은 장애물도 방향을 안내합니다.',
        media: {
          kind: 'sequence',
          ratio: '806 / 724',
          srcs: [
            'assets/ojo/obstacle-1.jpg',
            'assets/ojo/obstacle-2.jpg',
            'assets/ojo/obstacle-3.jpg',
            'assets/ojo/obstacle-4.jpg',
            'assets/ojo/obstacle-5.jpg',
            'assets/ojo/obstacle-6.jpg',
            'assets/ojo/obstacle-7.jpg',
          ],
        },
      },
      {
        title: '횡단보도 안전 횡단',
        desc: '신호등을 인식하고 차량 정지를 판단하는 상태 머신으로 안전한 횡단을 돕습니다.',
        media: { kind: 'video', src: 'assets/ojo/crosswalk.mp4' },
      },
      {
        title: '버스 번호 인식',
        desc: '정류장 체류를 감지하면 제스처 이전에 선제적으로 번호판을 읽어 즉시 안내합니다.',
        media: { kind: 'image', src: 'assets/ojo/bus-number.jpg' },
      },
      {
        title: '손 제스처 물체 인식',
        desc: '물체를 쥐면 Vision LLM이 식별해 음성으로 알려줍니다.',
        media: { kind: 'image', src: 'assets/ojo/hand-gesture.jpg' },
      },
      {
        title: '낙상 감지',
        desc: 'Galaxy Watch 센서로 실시간 낙상을 판별하고 긴급 알림을 보냅니다.',
        media: { kind: 'image', src: 'assets/ojo/fall-detection.jpg' },
      },
    ],
    troubleshooting: [
      {
        title: '다중 AI 실시간 파이프라인',
        problem:
          '세 모델을 순차 실행하면 **프레임당 320ms(3fps)** — 보행 중 부딪히기 전에 알리기엔 너무 느렸습니다.',
        solution:
          '**asyncio.gather 병렬화**로 세 모델을 동시에 돌리고, 평시엔 MediaPipe만 실행하는 **조건부 추론**을 결합했습니다.',
        result:
          '활성 시 **5fps**, 평시 **55fps**. 병렬화와 조건부 추론이 서로의 약점을 덮는 **하이브리드**입니다.',
      },
      {
        title: '학습할 수 없는 장애물',
        problem:
          '킥보드·공사 자재 같은 **불특정 장애물**을 YOLO로 전부 학습시키는 것은 불가능했습니다.',
        solution:
          '**"가까이 있으면 위험하다"**로 관점을 전환 — 깊이 맵의 최근접 물체를 YOLO 트랙과 **IoU 매칭**해 구분했습니다.',
        result:
          '**미학습 장애물도 감지**합니다. 무거운 깊이 모델은 필요한 순간에만 실행해 실시간성을 지켰습니다.',
      },
      {
        title: '버스 번호 인식의 Eager Evaluation',
        problem:
          '제스처 후에 YOLO→OCR→TTS를 처리하면, 그 사이에 **버스가 떠나버립니다**.',
        solution:
          'GPS로 **정류장 체류를 먼저 감지**하고, 그 순간부터 버스 탐지·OCR·TTS를 **선제 처리**해 결과를 대기시켰습니다.',
        result:
          '주먹을 쥐는 순간 **준비된 답을 즉시 전달** — **"기다림"을 "예측"으로** 바꾼 설계입니다.',
      },
    ],
    retrospective: [
      {
        heading: '실행을 줄이는 것도 최적화다',
        body: '대형 모델을 온디바이스로 욱여넣기보다, **정말 필요한 순간에만 실행**하도록 게이팅하는 편이 실시간성에 훨씬 효과적이었습니다. 조건부 추론만으로 평시 처리 속도를 **55fps**까지 끌어올렸습니다.',
      },
      {
        heading: '사용자의 의도를 미리 예측한다',
        body: '버스 번호 인식에서 제스처를 기다리지 않고 정류장 체류 시점부터 모든 처리를 선제 수행하는 **Eager Evaluation**을 적용했습니다. 사용자가 요청하는 바로 그 순간 **답이 이미 준비돼** 있게 만드는 것이 핵심이었습니다.',
      },
      {
        heading: '상충하는 전략을 하이브리드로',
        body: 'Eager의 자원 낭비와 Lazy의 대기 지연을 이분법으로 고르지 않고, 조건부 추론과 결합해 **서로의 약점을 서로의 강점으로 덮는** 설계 감각을 얻었습니다.',
      },
    ],
  },

  lidar: {
    overview:
      '현대제철 당진제철소에 납품되는 미세먼지 라이다 센서의 관제 웹 플랫폼입니다. 15분마다 유입되는 대량의 원천 측정 데이터를 구역 단위 통계로 가공하고, 미세먼지 농도 지도와 임계값 초과 알림을 제공합니다. 3개월간 2인 팀에서 백엔드·DB·인프라 전 영역을 담당했습니다.',
    features: [
      {
        title: '구역별 통계 집계',
        desc: '센서 원천 데이터를 셀·구역 단위 통계로 가공해 제공합니다.',
        media: { kind: 'image', src: 'assets/lidar/zone-stats.jpg' },
      },
      {
        title: '미세먼지 히트맵',
        desc: 'PM 농도를 위성 지도 위 히트맵으로 시각화합니다.',
        media: { kind: 'image', src: 'assets/lidar/heatmap.jpg' },
      },
      {
        title: '임계값 초과 알림',
        desc: '설정 임계값을 넘은 구역의 작업자에게 알림을 발송합니다.',
        media: { kind: 'image', src: 'assets/lidar/alert.jpg' },
      },
    ],
    troubleshooting: [
      {
        title: '공간 데이터 압축으로 DB I/O 병목 제거',
        problem:
          '15분마다 **약 20만 행**이 유입돼 INSERT가 과부하되고, DELETE가 남긴 **데드튜플**로 Autovacuum이 I/O를 점유했습니다.',
        solution:
          '측정점을 **H3 육각 셀로 사전 집계**해 요약 행만 저장하고, 월별 파티션을 DELETE 대신 **통째로 DROP**했습니다.',
        result:
          '저장 용량 **약 98% 감소**(실측), 데드튜플 원천 차단으로 **Autovacuum 부하 제거**.',
      },
      {
        title: '데이터 의존성 분리와 동적 공간 매핑',
        problem:
          '알림 구역이 **시스템 격자에 종속**돼, 격자 설정만 바뀌어도 사용자 설정을 마이그레이션해야 했습니다.',
        solution:
          '구역을 **PostGIS 폴리곤으로 독립 저장**해 디커플링하고, 10km 이내 범위를 근거로 **유클리드 근사**로 매칭했습니다.',
        result:
          '격자를 바꿔도 **사용자 설정 무변경**, 근사 **오차율 0.1% 이내**로 검증.',
      },
    ],
    retrospective: [
      {
        heading: '정밀함보다 적정함',
        body: '측정 범위 10km라는 도메인 제약을 근거로 구면 계산을 **유클리드 근사**로 대체해 **오차 0.1% 이내**를 유지하면서 연산을 단순화했습니다. 제약을 정확히 이해하면 더 단순한 정답이 보입니다.',
      },
      {
        heading: '저장 설계가 곧 운영 안정성',
        body: '고객사 구역 통계의 넓이에 맞춘 H3 셀 단위 사전 집계와 파티션 DROP으로 **저장을 아낀 결정**이, 데드튜플·VACUUM 부하 제거라는 **운영 안정성**으로 곧바로 이어진다는 것을 실측으로 확인했습니다.',
      },
      {
        heading: '경계를 끊어 변화에 강하게',
        body: '사용자 구역을 시스템 격자에서 **디커플링**해, 격자를 바꿔도 사용자 설정을 건드리지 않는 구조를 만들었습니다. 좋은 경계 설계가 곧 **유지보수 비용**을 좌우한다는 것을 배웠습니다.',
      },
    ],
  },

  smartcap: {
    overview:
      '공사장 작업자의 후방 안전을 지키는 스마트 안전모입니다. 깊이 센서나 라이다 없이, 안전모에 달린 단일 어안 카메라만으로 차량·건설 자재·하행 계단의 접근과 낙상 사고를 실시간 감지합니다. 6주간 6인 팀에서 백엔드·AI·기획을 맡아 SSAFY 특화 프로젝트 우수상(1등)을 수상했습니다.',
    features: [
      {
        title: '위험 객체 접근 감지',
        desc: '차량·건설 자재·하행 계단 3종의 접근을 실시간 감지합니다.',
        media: { kind: 'image', src: 'assets/smartcap/object-approach.jpg' },
      },
      {
        title: '센서리스 낙상 감지',
        desc: 'IMU 없이 영상만으로 급격한 머리 움직임을 판별합니다.',
        media: { kind: 'sequence', ratio: '1200 / 657', srcs: ['assets/smartcap/fall-1.jpg', 'assets/smartcap/fall-2.jpg'] },
      },
      {
        title: '자동 수평 보정',
        desc: '사용자 행동 패턴을 기반으로 스스로 영점을 조절합니다.',
        media: { kind: 'sequence', ratio: '1200 / 642', srcs: ['assets/smartcap/level-1.jpg', 'assets/smartcap/level-2.jpg'] },
      },
      {
        title: '실시간 모니터링 대시보드',
        desc: '사고 추세·유형별 현황·위험 순위를 실시간 표시합니다.',
        media: { kind: 'image', src: 'assets/smartcap/dashboard.jpg' },
      },
    ],
    troubleshooting: [
      {
        title: '객체별 차별화된 접근 감지 메트릭',
        problem:
          '단일 2D 카메라는 **절대 거리를 알 수 없고**, 깊이 센서를 달면 안전모가 무거워집니다. 범용 메트릭은 **투영 왜곡으로 오탐**이 났습니다.',
        solution:
          '객체별 기하 특성에 맞는 판별식 — 차량은 **박스 높이 변화율**, 원통 자재는 **단면 지름**, 하행 계단은 **소실점 Y좌표**.',
        result:
          '센서 무게 **약 10g**, 라이다 대비 **96% 경량화**. 세 감지기 병렬 실행으로 실시간 유지.',
      },
      {
        title: 'Homography 한 번으로 세 파이프라인',
        problem:
          '안전모가 기울면 계단 감지가 **오탐**을 냈고, 작업자마다 수동 캘리브레이션은 비현실적이었습니다.',
        solution:
          '낙상 감지에서 구한 **호모그래피를 재사용**해 roll 각도를 뽑고, 히스토그램 **최빈값을 "진짜 수평"**으로 삼았습니다.',
        result:
          '한 번의 계산으로 **세 파이프라인 동시 처리**, 연산량 **약 50% 절감** — self-calibrating 시스템.',
      },
    ],
    retrospective: [
      {
        heading: '제약이 설계를 낳는다',
        body: '깊이 센서를 달 수 없는 무게 제약이, 오히려 객체별 기하 특성을 깊이 파고드는 창의적인 판별식으로 이어졌습니다. **제약은 한계가 아니라 설계의 출발점**이었습니다.',
      },
      {
        heading: '행동 관찰이 알고리즘이 된다',
        body: '**"사람은 대부분 머리를 수평으로 유지한다"**는 단순한 관찰을 roll 각도 히스토그램의 **최빈값으로 코드화**해, **수동 캘리브레이션 없이** 자동으로 영점을 잡았습니다. 도메인 관찰과 기술 분해를 결합하는 문제 정의의 힘을 실감했습니다.',
      },
      {
        heading: '한 번 계산해 세 번 쓴다',
        body: '낙상 감지에서 구한 호모그래피를 수평 보정과 계단 오탐 필터에 재사용해 **연산을 절반으로** 줄였습니다. 이미 가진 정보를 다시 보는 눈이 성능을 만들었습니다.',
      },
    ],
  },

  moda: {
    overview:
      'AI가 요약한 콘텐츠로 나만의 포털을 만드는 큐레이션 플랫폼입니다. 웹 URL을 스크랩하면 크롤링 → AI 요약·키워드 추출 → 자동 분류 → 검색까지 비동기로 처리합니다. 6주간 6인 팀에서 백엔드·DB·기획을 맡아 SSAFY 공통 프로젝트 우수상(1등)을 수상했습니다.',
    features: [
      {
        title: '간편 웹 스크랩',
        desc: '오버레이·제스처 방식으로 웹사이트를 손쉽게 저장합니다.',
        media: { kind: 'montage', srcs: ['assets/moda/scrap-overlay.gif', 'assets/moda/scrap-gesture.gif'] },
      },
      {
        title: 'AI 요약 · 키워드',
        desc: '콘텐츠를 요약하고 키워드를 추출해 하이라이팅합니다.',
        media: { kind: 'image', src: 'assets/moda/summary.jpg' },
      },
      {
        title: '자동 분류 · 검색',
        desc: 'AI 자동 분류와 Elasticsearch 기반 검색을 제공합니다.',
        media: { kind: 'montage', srcs: ['assets/moda/search.jpg', 'assets/moda/classify.jpg'] },
      },
    ],
    troubleshooting: [
      {
        title: '스레드풀 고갈과 Bulkhead 격리',
        problem:
          '**동시 2~4명**의 카드 생성만으로 서버 전체가 마비 — 수십 초 블로킹되는 크롤링이 **ForkJoinPool 공용 풀**을 점유해 **검색 API까지 연쇄 마비**됐습니다.',
        solution:
          '**Bulkhead(격벽) 패턴**으로 워크로드별 스레드 풀을 물리 격리하고, 큐 초과 시 **즉시 503으로 fail-fast** 후 FCM으로 재시도를 안내했습니다.',
        result:
          '한 기능의 과부하가 다른 API로 **전파되지 않는 구조**를 확보 — **CPU 피크 77% 감소**(5.2% → 1.21%), **서버 마비 재발 0건**.',
      },
      {
        title: 'ES-PG 이중 저장소 정합성',
        problem:
          'PG 커밋이 실패해도 ES엔 이미 색인돼, **검색엔 뜨지만 상세는 404**인 유령 데이터가 남았습니다.',
        solution:
          '이중 쓰기를 **커밋 후 이벤트 리스너**로 통일해 PG 성공 후에만 ES 인덱싱하고, 실패는 **Redis 재시도 큐**로 보장했습니다.',
        result:
          '**유령 데이터 원천 차단**, 최종적 일관성 확보. 관련 인덱싱 버그도 함께 해결.',
      },
    ],
    retrospective: [
      {
        heading: '증상이 아니라 원인을',
        body: '모든 장애가 "서버 마비"라는 한 증상에서 나왔지만, 스레드 풀·트랜잭션 경계·이벤트 루프라는 **서로 다른 근본 원인을 추적**하는 과정에서 백엔드의 실체를 깊이 이해했습니다.',
      },
      {
        heading: '격리가 곧 회복탄력성',
        body: 'Bulkhead로 워크로드를 **물리 격리**하고 큐 초과 시 즉시 503으로 **fail-fast** 함으로써, 한 기능의 과부하가 시스템 전체를 무너뜨리지 않도록 만들었습니다.',
      },
      {
        heading: '정답 기술보다 적정 기술',
        body: 'Outbox나 CDC 같은 정석 패턴도 검토했지만 서비스 규모엔 과도하다고 판단해 더 가벼운 **"커밋 후 이벤트"** 방식을 택했습니다. 기술의 화려함이 아니라 **맥락에 맞는 선택**이 중요하다는 것을 배웠습니다.',
      },
    ],
  },
}
