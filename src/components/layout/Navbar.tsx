import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { Button } from '@/components/ui/button'
import { profile } from '@/data/profile'
import { scrollToId } from '@/lib/scroll'

/** index.html 인라인 스크립트가 첫 페인트 전에 적용한 테마를 이어받아 토글한다. */
function useTheme() {
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  const toggle = useCallback(() => {
    setDark((d) => {
      localStorage.setItem('theme', d ? 'light' : 'dark')
      return !d
    })
  }, [])
  return { dark, toggle }
}

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === '/'
  const { dark, toggle } = useTheme()

  // 로고: 홈에선 맨 위로 스크롤, 다른 페이지(프로젝트 상세)에선 메인으로 이동
  const goHome = () => {
    if (isHome) scrollToId('top')
    else navigate('/')
  }

  return (
    <header className="hairline-b sticky top-0 z-50 bg-background/80 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <button
          onClick={goHome}
          className="flex items-center gap-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="메인으로"
        >
          <span className="h-2 w-2 rounded-full bg-foreground" aria-hidden="true" />
          <span className="h-2 w-2 rounded-full bg-foreground" aria-hidden="true" />
          <span className="ml-1 text-sm font-semibold tracking-wide">
            {profile.nameEn}
          </span>
        </button>

        <nav className="flex items-center gap-1 sm:gap-2">
          <a
            href={`mailto:${profile.email}`}
            className="hidden rounded-sm px-2 text-xs font-medium tracking-widest text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:inline"
          >
            CONTACT
          </a>
          <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground">
            <a
              href={profile.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 프로필 열기"
            >
              <GithubIcon className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </nav>
      </Container>
    </header>
  )
}
