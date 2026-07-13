import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { projects } from '@/data/projects'

const BASE = import.meta.env.BASE_URL

export function Projects() {
  return (
    <section id="projects" className="scroll-mt-20 bg-white py-24 sm:py-32">
      <Container>
        <div className="mb-14 flex items-end justify-between">
          <div>
            <p className="mb-3 flex items-center gap-3 text-sm tracking-[0.3em] text-gray-500">
              <span className="h-px w-8 bg-black/30" aria-hidden="true" />
              SELECTED WORK
            </p>
            <h2 className="text-4xl font-light tracking-tight sm:text-5xl">
              PROJECTS
            </h2>
          </div>
          <span className="text-sm text-gray-400">— 04</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f8f8f8] transition-all duration-300 hover:-translate-y-1 hover:border-black/30 hover:shadow-xl hover:shadow-black/5"
            >
              {/* 카드 전체 클릭 영역 (stretched link) */}
              <Link
                to={`/project/${p.id}`}
                aria-label={`${p.name} 체험하기`}
                className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              />

              {/* 대표 이미지 배너 (없으면 accent 그라디언트 폴백) */}
              <div className="relative aspect-[16/7] overflow-hidden border-b border-black/5 bg-white">
                {p.thumb ? (
                  <img
                    src={BASE + p.thumb}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${p.accent}`} aria-hidden="true" />
                )}
              </div>

              {/* 콘텐츠 */}
              <div className="relative flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-xs text-gray-400">{p.index}</span>
                      <h3 className="text-lg font-medium tracking-tight sm:text-xl">{p.name}</h3>
                    </div>
                    <p className="mt-1 text-[13px] text-gray-500">
                      {p.nameKo} · {p.tagline}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5 pt-1">
                    {p.github && (
                      <a
                        href={p.github}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${p.name} GitHub 저장소`}
                        className="relative z-20 text-gray-400 transition-colors hover:text-black"
                      >
                        <GithubIcon className="h-[18px] w-[18px]" />
                      </a>
                    )}
                    <ArrowUpRight className="h-[18px] w-[18px] text-gray-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-black" />
                  </div>
                </div>

                <p className="mt-3 text-[13px] leading-relaxed text-gray-600">{p.highlight}</p>

                <div className="mb-4 mt-4 flex flex-nowrap gap-1.5 overflow-hidden [mask-image:linear-gradient(to_right,black_90%,transparent)]">
                  {p.stack.map((s) => (
                    <span
                      key={s}
                      className="shrink-0 whitespace-nowrap rounded-full border border-black/10 bg-white px-2.5 py-0.5 text-[11px] text-gray-600"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-black/5 pt-4">
                  <span className="pt-0.5 text-[11px] tracking-wide text-gray-500">
                    {p.role} · {p.meta}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium tracking-wide text-black">
                    체험하기
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
