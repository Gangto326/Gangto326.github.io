import { useLocation, useNavigate } from 'react-router-dom'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { profile } from '@/data/profile'
import { scrollToId } from '@/lib/scroll'

const links = [
  { id: 'projects', label: 'PROJECTS' },
  { id: 'about', label: 'ABOUT' },
]

export function Navbar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === '/'

  // 로고: 홈에선 맨 위로 스크롤, 다른 페이지(프로젝트 상세)에선 메인으로 이동
  const goHome = () => {
    if (isHome) scrollToId('top')
    else navigate('/')
  }

  // 섹션 이동: 홈이면 바로 스크롤, 다른 페이지면 홈으로 이동 후 스크롤
  const goToSection = (id: string) => {
    if (isHome) {
      scrollToId(id)
    } else {
      navigate('/')
      window.setTimeout(() => scrollToId(id), 400)
    }
  }

  return (
    <>
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

      {/* 우측 세로 플로팅 내비 — 화면을 따라다님(PROJECTS·ABOUT) */}
      <nav className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-4 md:flex">
        {links.map((l) => (
          <button
            key={l.id}
            onClick={() => goToSection(l.id)}
            className="group flex items-center gap-2 text-[11px] tracking-[0.2em] text-gray-500 transition-colors hover:text-black"
          >
            {l.label}
            <span className="h-px w-4 bg-gray-300 transition-all group-hover:w-7 group-hover:bg-black" />
          </button>
        ))}
      </nav>
    </>
  )
}
