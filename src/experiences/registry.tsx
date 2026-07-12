import { lazy, type ComponentType } from 'react'
import { BusEagerDemo } from '@/experiences/ojo/BusEagerDemo'
import { LidarH3Demo } from '@/experiences/lidar/LidarH3Demo'
import { BulkheadDemo } from '@/experiences/moda/BulkheadDemo'

/**
 * projectId → 체험형 데모 컴포넌트 매핑.
 * 각 데모는 커밋 6~9에서 순차적으로 추가된다. 없는 항목은 ProjectDetail에서
 * "준비 중" placeholder로 대체된다.
 *
 * smartcap 데모는 three.js(3D)를 쓰므로 lazy 로드해 해당 번들을 코드스플릿한다.
 * ProjectDetail이 <Suspense>로 감싸 로딩 폴백을 처리한다.
 */
const SmartcapMetricDemo = lazy(() =>
  import('@/experiences/smartcap/SmartcapMetricDemo').then((m) => ({ default: m.SmartcapMetricDemo })),
)

export const experienceRegistry: Record<string, ComponentType> = {
  ojo: BusEagerDemo,
  lidar: LidarH3Demo,
  smartcap: SmartcapMetricDemo,
  moda: BulkheadDemo,
}
