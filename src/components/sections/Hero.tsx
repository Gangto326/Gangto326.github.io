import { motion } from 'framer-motion'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { Container } from '@/components/Container'
import { Button } from '@/components/ui/button'
import { profile } from '@/data/profile'
import { scrollToId } from '@/lib/scroll'

const PROFILE_SRC = `${import.meta.env.BASE_URL}assets/profile.jpg`

const stats = [
  { value: '4', label: 'PROJECTS' },
  { value: 'AI + BACKEND', label: 'FOCUS' },
  { value: '우수상 1등 다수', label: 'SSAFY AWARDS' },
]

export function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-background text-foreground">
      {/* 좌상단에서 옅어지는 도트 그리드 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,hsl(var(--foreground)/0.07)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_80%_70%_at_15%_10%,black,transparent)]"
      />
      {/* 앰비언트 글로우 — 라이트: 웜, 다크: 청녹. 단일 배경의 단조로움을 깬다 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_55%_45%_at_75%_8%,hsl(var(--glow)/0.10),transparent_70%)] dark:[background:radial-gradient(ellipse_55%_45%_at_75%_8%,hsl(var(--glow)/0.16),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden dark:block dark:[background:radial-gradient(ellipse_45%_35%_at_10%_90%,hsl(var(--glow)/0.08),transparent_70%)]"
      />

      <Container className="relative pb-24 pt-10 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* 좌: 텍스트 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="order-2 lg:order-1"
          >
            <p className="mb-6 flex items-center gap-3 text-xs font-medium tracking-widest text-muted-foreground">
              <span className="h-px w-8 bg-foreground/30" aria-hidden="true" />
              AI · BACKEND ENGINEER
            </p>
            <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tighter sm:text-6xl xl:text-7xl">
              사용자{' '}
              <span className="bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 bg-clip-text text-transparent dark:from-teal-300 dark:via-cyan-300 dark:to-emerald-300">
                경험
              </span>
              을
              <br />
              설계하는 개발자
            </h1>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                onClick={() => scrollToId('projects')}
                className="group rounded-full px-8 text-xs font-medium tracking-widest"
              >
                EXPLORE PROJECTS
                <ArrowDown className="transition-transform duration-300 group-hover:translate-y-0.5" />
              </Button>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="group rounded-full px-4 text-xs font-medium tracking-widest text-muted-foreground hover:text-foreground"
              >
                <a href={`mailto:${profile.email}`}>
                  CONTACT
                  <ArrowUpRight className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </Button>
            </div>

            <div className="mt-16 flex items-stretch gap-6 sm:gap-8">
              {stats.map((s, i) => (
                <div key={s.label} className={i > 0 ? 'border-l border-border pl-6 sm:pl-8' : ''}>
                  <p className="text-base font-semibold tracking-tight sm:text-lg">{s.value}</p>
                  <p className="mt-2 text-xs tracking-widest text-muted-foreground">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 우: 프로필 사진 + 그라디언트 블롭 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            className="relative order-1 flex justify-center lg:order-2"
          >
            <div
              className="absolute -right-4 -top-6 h-64 w-64 rounded-full bg-gradient-to-br from-pink-400 via-orange-300 to-yellow-200 opacity-60 blur-3xl dark:from-teal-400 dark:via-cyan-400 dark:to-emerald-300 dark:opacity-25 sm:h-80 sm:w-80"
              aria-hidden="true"
            />
            <div className="relative">
              <img
                src={PROFILE_SRC}
                alt="김강토 프로필 사진"
                className="aspect-[4/5] w-60 rounded-lg object-cover shadow-md ring-1 ring-border sm:w-72 lg:w-80"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <span className="text-sm font-medium">김강토 · GANGTO</span>
                <span className="h-px w-12 bg-foreground" aria-hidden="true" />
              </div>
            </div>
          </motion.div>
        </div>

        <button
          onClick={() => scrollToId('projects')}
          className="mt-16 flex items-center gap-2 rounded-sm text-xs tracking-widest text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowDown className="h-4 w-4 animate-bounce" aria-hidden="true" />
          SCROLL
        </button>
      </Container>
    </section>
  )
}
