import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { Card } from '@/components/ui/card'
import { projects } from '@/data/projects'

const BASE = import.meta.env.BASE_URL

export function Projects() {
  return (
    <section id="projects" className="relative scroll-mt-20 overflow-hidden border-t border-border bg-background py-24 sm:py-32">
      {/* 다크에서 상단을 은은히 밝히는 청녹 글로우 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden dark:block dark:[background:radial-gradient(ellipse_60%_30%_at_50%_0%,hsl(var(--glow)/0.07),transparent_70%)]"
      />
      <Container className="relative">
        <div className="mb-14 flex items-end justify-between">
          <div>
            <p className="mb-3 flex items-center gap-3 text-xs font-medium tracking-widest text-muted-foreground">
              <span className="h-px w-8 bg-foreground/30" aria-hidden="true" />
              SELECTED WORK
            </p>
            <h2 className="text-4xl font-semibold tracking-tighter sm:text-5xl">
              PROJECTS
            </h2>
          </div>
          <span className="text-sm tabular-nums text-muted-foreground">
            — {String(projects.length).padStart(2, '0')}
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
              className="flex"
            >
              <Card className="group relative flex flex-1 flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-foreground/30 hover:shadow-md">
                {/* hover 시 프로젝트 액센트 헤어라인 */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 z-20 h-1 bg-gradient-to-r ${p.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                />
                {/* 카드 전체 클릭 영역 (stretched link) */}
                <Link
                  to={`/project/${p.id}`}
                  aria-label={`${p.name} 체험하기`}
                  className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />

                {/* 대표 이미지 배너 (없으면 accent 그라디언트 폴백) */}
                <div className="relative aspect-[16/7] overflow-hidden border-b border-border bg-muted/50">
                  {p.thumb ? (
                    <img
                      src={BASE + p.thumb}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${p.accent}`} aria-hidden="true" />
                  )}
                </div>

                {/* 콘텐츠 */}
                <div className="relative flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">{p.index}</span>
                        <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{p.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {p.nameKo} · {p.tagline}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pt-1">
                      {p.github && (
                        <a
                          href={p.github}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`${p.name} GitHub 저장소`}
                          className="relative z-20 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <GithubIcon className="h-4 w-4" />
                        </a>
                      )}
                      <ArrowUpRight
                        className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.highlight}</p>

                  <div className="mb-4 mt-4 flex flex-nowrap gap-2 overflow-hidden [mask-image:linear-gradient(to_right,black_90%,transparent)]">
                    {p.stack.map((s) => (
                      <span
                        key={s}
                        className="shrink-0 whitespace-nowrap rounded-full border border-border bg-secondary px-2 py-1 text-xs leading-none text-secondary-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                    <span className="text-xs tracking-wide text-muted-foreground">
                      {p.role} · {p.meta}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium tracking-wide text-foreground">
                      체험하기
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
