import type { ComponentType } from 'react'
import { BusEagerDemo } from '@/experiences/ojo/BusEagerDemo'

/**
 * projectId → 체험형 데모 컴포넌트 매핑.
 * 각 데모는 커밋 6~9에서 순차적으로 추가된다. 없는 항목은 ProjectDetail에서
 * "준비 중" placeholder로 대체된다.
 */
export const experienceRegistry: Record<string, ComponentType> = {
  ojo: BusEagerDemo,
  // lidar: LidarH3Demo,          ← 커밋 7
  // smartcap: SmartcapMetricDemo,← 커밋 8
  // moda: BulkheadDemo,          ← 커밋 9
}
