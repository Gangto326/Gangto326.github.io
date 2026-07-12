import type { ReactNode } from 'react'
import { RotateCcw } from 'lucide-react'

interface ExperienceShellProps {
  title: string
  subtitle?: string
  /** 조작 안내 (하단에 표시) */
  hint?: string
  /** 리셋 버튼 핸들러 (없으면 버튼 숨김) */
  onReset?: () => void
  children: ReactNode
}

/**
 * 모든 체험형 데모의 공통 껍데기.
 * 제목·설명·리셋 버튼·조작 안내를 제공하고, 데모 본체를 children으로 감싼다.
 */
export function ExperienceShell({
  title,
  subtitle,
  hint,
  onReset,
  children,
}: ExperienceShellProps) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6 sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-gray-400">EXPERIENCE</p>
          <h3 className="mt-1 text-xl font-medium tracking-tight">{title}</h3>
          {subtitle && (
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/15 px-3.5 py-2 text-xs text-gray-600 transition-colors hover:border-black hover:text-black"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            리셋
          </button>
        )}
      </div>

      <div>{children}</div>

      {hint && (
        <p className="mt-5 border-t border-black/5 pt-4 text-xs leading-relaxed text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}
