import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ExperienceShell } from '@/experiences/ExperienceShell'
import { experienceRegistry } from '@/experiences/registry'
import { projects } from '@/data/projects'
import { projectContent } from '@/data/projectContent'

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="mb-2 text-xs tracking-[0.25em] text-gray-400">{eyebrow}</p>
      <h2 className="text-2xl font-light tracking-tight sm:text-3xl">{title}</h2>
    </div>
  )
}

/** 이미지 준비 전 자리표시 박스 */
function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/15 bg-white text-gray-300 ${className}`}
    >
      <ImageIcon className="h-6 w-6" />
      <span className="text-xs">이미지 준비 중</span>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const project = projects.find((p) => p.id === id)
  const content = id ? projectContent[id] : undefined
  const [tIdx, setTIdx] = useState(0)

  if (!project || !content) {
    return (
      <div className="min-h-screen bg-[#f8f8f8]">
        <Navbar />
        <Container className="py-32 text-center">
          <p className="text-gray-500">프로젝트를 찾을 수 없습니다.</p>
          <Link to="/" className="mt-4 inline-block text-sm underline">
            홈으로 돌아가기
          </Link>
        </Container>
        <Footer />
      </div>
    )
  }

  const Demo = experienceRegistry[project.id]
  const ts = content.troubleshooting
  const cur = ts[tIdx]

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-black">
      <Navbar />
      <Container className="py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" /> ALL PROJECTS
        </Link>

        {/* 헤더 */}
        <header className="mt-8 border-b border-black/10 pb-12">
          <span className="text-sm text-gray-400">{project.index}</span>
          <h1 className="mt-2 text-4xl font-light tracking-tight sm:text-5xl">
            {project.name}
          </h1>
          <p className="mt-2 text-gray-500">
            {project.nameKo} · {project.tagline}
          </p>
          <p className="mt-6 max-w-2xl leading-relaxed text-gray-700">
            {project.highlight}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {project.stack.map((s) => (
              <span
                key={s}
                className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs text-gray-600"
              >
                {s}
              </span>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span className="text-xs tracking-wide text-gray-500">
              {project.role} · {project.meta}
            </span>
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/20 px-4 py-2 text-xs transition-colors hover:border-black"
              >
                <GithubIcon className="h-4 w-4" /> GitHub
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </header>

        {/* 개요 */}
        <section className="py-14">
          <SectionHeading eyebrow="OVERVIEW" title="프로젝트 개요" />
          <p className="mt-6 max-w-2xl leading-relaxed text-gray-700">
            {content.overview}
          </p>
        </section>

        {/* 핵심 기능 — 하나씩, 이미지와 함께 */}
        <section className="border-t border-black/10 py-14">
          <SectionHeading eyebrow="FEATURES" title="핵심 기능" />
          <div className="mt-10 space-y-12">
            {content.features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5 }}
                className="grid items-center gap-6 sm:grid-cols-2 sm:gap-10"
              >
                <ImagePlaceholder
                  className={`aspect-video ${i % 2 === 1 ? 'sm:order-2' : ''}`}
                />
                <div className={i % 2 === 1 ? 'sm:order-1' : ''}>
                  <span className="text-sm text-gray-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-1 text-xl font-medium tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-gray-600">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 트러블슈팅 — 가로 배치 + 수동 슬라이드 */}
        <section className="border-t border-black/10 py-14">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading eyebrow="TROUBLESHOOTING" title="기술적 문제 해결" />
            <div className="flex items-center gap-3">
              <span className="text-sm tabular-nums text-gray-400">
                {tIdx + 1} / {ts.length}
              </span>
              <button
                onClick={() => setTIdx((i) => Math.max(0, i - 1))}
                disabled={tIdx === 0}
                aria-label="이전"
                className="rounded-full border border-black/15 p-2 text-gray-600 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTIdx((i) => Math.min(ts.length - 1, i + 1))}
                disabled={tIdx === ts.length - 1}
                aria-label="다음"
                className="rounded-full border border-black/15 p-2 text-gray-600 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <motion.article
            key={tIdx}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mt-8 rounded-3xl border border-black/10 bg-white p-6 sm:p-10"
          >
            <h3 className="text-lg font-medium tracking-tight sm:text-xl">
              {cur.title}
            </h3>
            <div className="mt-8 grid gap-6 sm:grid-cols-3 sm:gap-8">
              {[
                { k: '문제', v: cur.problem, c: 'text-rose-500', b: 'bg-rose-50' },
                { k: '해결', v: cur.solution, c: 'text-sky-500', b: 'bg-sky-50' },
                { k: '결과', v: cur.result, c: 'text-emerald-500', b: 'bg-emerald-50' },
              ].map((col) => (
                <div key={col.k}>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium tracking-[0.15em] ${col.c} ${col.b}`}
                  >
                    {col.k}
                  </span>
                  <p className="mt-4 text-sm leading-relaxed text-gray-700">
                    {col.v}
                  </p>
                </div>
              ))}
            </div>
          </motion.article>

          {/* 점 인디케이터 */}
          <div className="mt-6 flex justify-center gap-2">
            {ts.map((_, i) => (
              <button
                key={i}
                onClick={() => setTIdx(i)}
                aria-label={`${i + 1}번 트러블슈팅`}
                className={`h-1.5 rounded-full transition-all ${
                  i === tIdx ? 'w-6 bg-black' : 'w-1.5 bg-black/20'
                }`}
              />
            ))}
          </div>
        </section>

        {/* 회고 — 포인트 굵게 */}
        <section className="border-t border-black/10 py-14">
          <SectionHeading eyebrow="RETROSPECTIVE" title="회고" />
          <div className="mt-8 space-y-8">
            {content.retrospective.map((r, i) => (
              <div key={i} className="max-w-2xl border-l-2 border-black/10 pl-5">
                <h3 className="text-lg font-semibold tracking-tight">
                  {r.heading}
                </h3>
                <p className="mt-2 leading-relaxed text-gray-600">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 체험형 데모 (맨 아래) */}
        <section className="border-t border-black/10 py-14">
          {Demo ? (
            <Demo />
          ) : (
            <ExperienceShell
              title={project.experience}
              subtitle="인터랙티브 데모 준비 중"
            >
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-black/15 py-16 text-center text-sm text-gray-400">
                곧 이 자리에서 직접 조작하며 핵심 원리를 체험할 수 있습니다.
              </div>
            </ExperienceShell>
          )}
        </section>
      </Container>
      <Footer />
    </div>
  )
}
