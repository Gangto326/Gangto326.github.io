import { useLocation, useNavigate } from 'react-router-dom'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { profile } from '@/data/profile'
import { scrollToId } from '@/lib/scroll'

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === '/'

  // 로고: 홈에선 맨 위로 스크롤, 다른 페이지(프로젝트 상세)에선 메인으로 이동
  const goHome = () => {
    if (isHome) scrollToId('top')
    else navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f8f8f8]/80 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <button
          onClick={goHome}
          className="flex items-center gap-2"
          aria-label="메인으로"
        >
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="ml-1 text-sm font-medium tracking-wide">
            {profile.nameEn}
          </span>
        </button>

        <nav className="flex items-center gap-6">
          <a
            href={`mailto:${profile.email}`}
            className="hidden text-xs tracking-widest text-gray-600 transition-colors hover:text-black sm:inline"
          >
            CONTACT
          </a>
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="text-gray-700 transition-colors hover:text-black"
          >
            <GithubIcon className="h-5 w-5" />
          </a>
        </nav>
      </Container>
    </header>
  )
}
