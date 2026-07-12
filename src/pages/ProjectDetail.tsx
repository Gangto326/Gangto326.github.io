import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
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
    <div className="mb-6">
      <p className="mb-2 text-xs tracking-[0.25em] text-gray-400">{eyebrow}</p>
      <h2 className="text-2xl font-light tracking-tight sm:text-3xl">{title}</h2>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const project = projects.find((p) => p.id === id)
  const content = id ? projectContent[id] : undefined

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
          <p className="max-w-2xl leading-relaxed text-gray-700">
            {content.overview}
          </p>
        </section>

        {/* 핵심 기능 */}
        <section className="border-t border-black/10 py-14">
          <SectionHeading eyebrow="FEATURES" title="핵심 기능" />
          <ul className="grid gap-3 sm:grid-cols-2">
            {content.features.map((f, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-2xl border border-black/10 bg-white p-4 text-sm leading-relaxed text-gray-700"
              >
                <span className="shrink-0 text-gray-300">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* 트러블슈팅 */}
        <section className="border-t border-black/10 py-14">
          <SectionHeading eyebrow="TROUBLESHOOTING" title="기술적 문제 해결" />
          <div className="space-y-6">
            {content.troubleshooting.map((t, i) => (
              <article
                key={i}
                className="rounded-3xl border border-black/10 bg-white p-6 sm:p-8"
              >
                <h3 className="text-lg font-medium tracking-tight">
                  {t.title}
                </h3>
                <dl className="mt-5 space-y-4">
                  {[
                    { k: '문제', v: t.problem, c: 'text-rose-500' },
                    { k: '해결', v: t.solution, c: 'text-sky-500' },
                    { k: '결과', v: t.result, c: 'text-emerald-500' },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="grid gap-1 sm:grid-cols-[64px_1fr] sm:gap-4"
                    >
                      <dt
                        className={`text-xs font-medium tracking-[0.15em] ${row.c}`}
                      >
                        {row.k}
                      </dt>
                      <dd className="text-sm leading-relaxed text-gray-700">
                        {row.v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* 회고 */}
        <section className="border-t border-black/10 py-14">
          <SectionHeading eyebrow="RETROSPECTIVE" title="회고" />
          <div className="max-w-2xl space-y-4">
            {content.retrospective.map((r, i) => (
              <p key={i} className="leading-relaxed text-gray-700">
                {r}
              </p>
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
