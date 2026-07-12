import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { profile } from '@/data/profile'
import { scrollToId } from '@/lib/scroll'

const links = [
  { id: 'projects', label: 'PROJECTS' },
  { id: 'about', label: 'ABOUT' },
  { id: 'contact', label: 'CONTACT' },
]

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f8f8f8]/80 backdrop-blur">
      <Container className="flex items-center justify-between py-4">
        <button
          onClick={() => scrollToId('top')}
          className="flex items-center gap-2"
          aria-label="맨 위로"
        >
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="ml-1 text-sm font-medium tracking-wide">
            {profile.nameEn}
          </span>
        </button>

        <nav className="flex items-center gap-6">
          <div className="hidden items-center gap-6 sm:flex">
            {links.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollToId(l.id)}
                className="text-xs tracking-widest text-gray-600 transition-colors hover:text-black"
              >
                {l.label}
              </button>
            ))}
          </div>
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
