import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { projects } from '@/data/projects'

export function Projects() {
  return (
    <section id="projects" className="scroll-mt-20 bg-white py-24 sm:py-32">
      <Container>
        <div className="mb-14 flex items-end justify-between">
          <div>
            <p className="mb-3 text-sm tracking-[0.3em] text-gray-500">
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
              className="group relative flex flex-col overflow-hidden rounded-3xl border border-black/10 bg-[#f8f8f8] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-black/30 hover:shadow-xl hover:shadow-black/5"
            >
              {/* 카드 전체 클릭 영역 (stretched link) */}
              <Link
                to={`/project/${p.id}`}
                aria-label={`${p.name} 체험하기`}
                className="absolute inset-0 z-10 rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              />

              {/* 호버 시 나타나는 액센트 블롭 */}
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${p.accent} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70`}
                aria-hidden="true"
              />

              <div className="relative flex items-center justify-between">
                <span className="text-sm text-gray-400">{p.index}</span>
                <div className="flex items-center gap-3">
                  {p.github && (
                    <a
                      href={p.github}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${p.name} GitHub 저장소`}
                      className="relative z-20 text-gray-400 transition-colors hover:text-black"
                    >
                      <GithubIcon className="h-5 w-5" />
                    </a>
                  )}
                  <ArrowUpRight className="h-5 w-5 text-gray-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-black" />
                </div>
              </div>

              <div className="relative mt-8">
                <h3 className="text-2xl font-medium tracking-tight">{p.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {p.nameKo} · {p.tagline}
                </p>
              </div>

              <p className="relative mt-5 text-sm leading-relaxed text-gray-600">
                {p.highlight}
              </p>

              <div className="relative mt-6 flex flex-wrap gap-2">
                {p.stack.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-gray-600"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <div className="relative mt-8 flex items-center justify-between border-t border-black/5 pt-5">
                <span className="text-xs tracking-wide text-gray-500">
                  {p.role} · {p.meta}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium tracking-wide text-black">
                  체험하기
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  )
}
