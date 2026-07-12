import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { GithubIcon } from '@/components/icons/GithubIcon'
import { Container } from '@/components/Container'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { projects } from '@/data/projects'

export default function ProjectDetail() {
  const { id } = useParams()
  const project = projects.find((p) => p.id === id)

  if (!project) {
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

        <div className="mt-8">
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
        </div>

        {/* 체험형 데모 자리 (커밋 6~9에서 실제 데모로 교체) */}
        <div className="mt-14 rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center sm:p-20">
          <p className="text-sm tracking-[0.2em] text-gray-400">EXPERIENCE</p>
          <h2 className="mt-3 text-2xl font-light tracking-tight">
            {project.experience}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
            인터랙티브 데모 준비 중 — 곧 이 자리에서 직접 조작하며 프로젝트의
            핵심 원리를 체험할 수 있습니다.
          </p>
        </div>
      </Container>
      <Footer />
    </div>
  )
}
