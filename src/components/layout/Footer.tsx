import { ArrowUp, ArrowUpRight } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { Button } from '@/components/ui/button'
import { profile } from '@/data/profile'
import { scrollToId } from '@/lib/scroll'

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      {/* 앰비언트 글로우 — 라이트: 웜, 다크: 청녹 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_50%_60%_at_15%_100%,hsl(var(--glow)/0.08),transparent_70%)] dark:[background:radial-gradient(ellipse_50%_60%_at_15%_100%,hsl(var(--glow)/0.12),transparent_70%)]"
      />
      <Container className="relative py-20 sm:py-24">
        <p className="flex items-center gap-3 text-xs font-medium tracking-widest text-muted-foreground">
          <span className="h-px w-8 bg-foreground/30" aria-hidden="true" />
          CONTACT
        </p>
        <a
          href={`mailto:${profile.email}`}
          className="group mt-8 inline-flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span className="break-all text-2xl font-semibold tracking-tighter text-foreground underline-offset-8 transition-colors group-hover:underline group-hover:decoration-1 sm:text-4xl lg:text-5xl">
            {profile.email}
          </span>
          <ArrowUpRight
            className="hidden h-6 w-6 self-center text-muted-foreground transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-foreground sm:block sm:h-8 sm:w-8"
            aria-hidden="true"
          />
        </a>
        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
          새로운 문제와 좋은 팀을 찾고 있습니다. 프로젝트·채용 관련 연락을
          환영합니다.
        </p>

        <div className="mt-10">
          <Button
            asChild
            variant="outline"
            className="rounded-full text-xs font-medium tracking-widest text-muted-foreground hover:text-foreground"
          >
            <a href={profile.github} target="_blank" rel="noreferrer">
              <GithubIcon className="h-4 w-4" />
              GITHUB
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2026 {profile.name} · {profile.nameEn}
          </p>
          <button
            onClick={() => scrollToId('top')}
            className="flex items-center gap-2 rounded-sm text-xs tracking-widest text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            BACK TO TOP
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </Container>
    </footer>
  )
}
