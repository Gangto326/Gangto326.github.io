import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

interface ExperienceShellProps {
  title: string
  subtitle?: string
  /** 조작 안내 (하단에 표시) — 배열이면 점(•) 리스트로 렌더링 */
  hint?: string | string[]
  /** 리셋 버튼 핸들러 (없으면 버튼 숨김) */
  onReset?: () => void
  children: ReactNode
}

/**
 * 모든 체험형 데모의 공통 껍데기.
 * 제목·설명·리셋 버튼·조작 안내를 제공하고, 데모 본체를 children으로 감싼다.
 * 다크 모드에선 카드·컨트롤이 다크 팔레트를 따르되, 미디어성 서피스
 * (시연 영상·다이어그램 PNG·3D 뷰포트)는 라이트 튜닝을 유지한다.
 */
export function ExperienceShell({
  title,
  subtitle,
  hint,
  onReset,
  children,
}: ExperienceShellProps) {
  return (
    <div
      data-experience-card
      className="surface-card rounded-lg border border-black/10 bg-white p-6 text-neutral-900 shadow-sm dark:border-white/10 dark:bg-card dark:text-neutral-100 sm:p-8"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-widest text-gray-400">EXPERIENCE</p>
          <h3 className="mt-1 text-xl font-medium tracking-tight">{title}</h3>
          {subtitle && (
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/15 px-3.5 py-2 text-xs text-gray-600 transition-colors hover:border-black hover:text-black dark:border-white/20 dark:text-gray-300 dark:hover:border-white dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            리셋
          </button>
        )}
      </div>

      <div>{children}</div>

      {hint && (
        <div className="mt-5 border-t border-black/5 pt-4 text-xs leading-relaxed text-gray-400 dark:border-white/10">
          {Array.isArray(hint) ? (
            <ul className="list-disc space-y-1.5 pl-4">
              {hint.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          ) : (
            <p>{hint}</p>
          )}
        </div>
      )}
    </div>
  )
}
