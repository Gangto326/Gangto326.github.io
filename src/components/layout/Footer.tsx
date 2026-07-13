import { ArrowUp, ArrowUpRight } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { profile } from '@/data/profile'
import { scrollToId } from '@/lib/scroll'

export function Footer() {
  return (
    <footer className="bg-[#111] text-white">
      <Container className="py-20 sm:py-24">
        <p className="flex items-center gap-3 text-xs tracking-[0.3em] text-white/40">
          <span className="h-px w-8 bg-white/25" aria-hidden="true" />
          CONTACT
        </p>
        <a
          href={`mailto:${profile.email}`}
          className="group mt-7 inline-flex flex-wrap items-baseline gap-x-4 gap-y-2"
        >
          <span className="text-3xl font-light tracking-tight text-white/90 underline-offset-[10px] transition-colors group-hover:text-white group-hover:underline group-hover:decoration-1 sm:text-5xl">
            {profile.email}
          </span>
          <ArrowUpRight className="h-6 w-6 self-center text-white/40 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-white sm:h-8 sm:w-8" />
        </a>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-white/50">
          새로운 문제와 좋은 팀을 찾고 있습니다. 프로젝트·채용 관련 연락을
          환영합니다.
        </p>

        <div className="mt-10">
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs tracking-widest text-white/70 transition-colors hover:border-white/60 hover:text-white"
          >
            <GithubIcon className="h-4 w-4" />
            GITHUB
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-white/35">
            © 2026 {profile.name} · {profile.nameEn}
          </p>
          <button
            onClick={() => scrollToId('top')}
            className="flex items-center gap-1.5 text-xs tracking-widest text-white/50 transition-colors hover:text-white"
          >
            BACK TO TOP
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </Container>
    </footer>
  )
}
