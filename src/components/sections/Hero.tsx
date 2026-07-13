import { motion } from 'framer-motion'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { Container } from '@/components/Container'
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
    <section id="top" className="relative overflow-hidden bg-[#f8f8f8] text-black">
      {/* 좌상단에서 옅어지는 도트 그리드 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(0,0,0,0.07)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_80%_70%_at_15%_10%,black,transparent)]"
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
            <p className="mb-6 flex items-center gap-3 text-sm tracking-[0.3em] text-gray-500">
              <span className="h-px w-8 bg-black/30" aria-hidden="true" />
              AI · BACKEND ENGINEER
            </p>
            <h1 className="text-5xl font-light leading-[1.08] tracking-tight sm:text-6xl xl:text-7xl">
              사용자{' '}
              <span className="bg-gradient-to-r from-pink-500 via-orange-400 to-amber-400 bg-clip-text text-transparent">
                경험
              </span>
              을
              <br />
              설계하는 개발자
            </h1>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={() => scrollToId('projects')}
                className="group inline-flex items-center gap-2.5 rounded-full bg-black px-7 py-3.5 text-xs font-medium tracking-[0.15em] text-white transition-colors hover:bg-gray-800"
              >
                EXPLORE PROJECTS
                <ArrowDown className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
              </button>
              <a
                href={`mailto:${profile.email}`}
                className="group inline-flex items-center gap-1.5 px-3 py-3.5 text-xs font-medium tracking-[0.15em] text-gray-600 transition-colors hover:text-black"
              >
                CONTACT
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            </div>

            <div className="mt-14 flex items-stretch gap-7 sm:gap-9">
              {stats.map((s, i) => (
                <div key={s.label} className={i > 0 ? 'border-l border-black/10 pl-7 sm:pl-9' : ''}>
                  <p className="text-base font-medium tracking-tight sm:text-lg">{s.value}</p>
                  <p className="mt-1.5 text-[10px] tracking-[0.2em] text-gray-500 sm:text-[11px]">
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
            className="relative order-1 flex justify-center lg:order-2 lg:justify-end"
          >
            <div
              className="absolute -right-4 -top-6 h-64 w-64 animate-pulse rounded-full bg-gradient-to-br from-pink-400 via-orange-300 to-yellow-200 opacity-70 blur-3xl sm:h-80 sm:w-80"
              aria-hidden="true"
            />
            <div className="relative">
              <img
                src={PROFILE_SRC}
                alt="김강토 프로필 사진"
                className="aspect-[4/5] w-60 rounded-3xl object-cover shadow-xl ring-1 ring-black/5 sm:w-72 lg:w-80"
              />
              <div className="mt-4 flex items-center justify-end space-x-2">
                <span className="text-sm">김강토 · GANGTO</span>
                <span className="h-px w-12 bg-black" />
              </div>
            </div>
          </motion.div>
        </div>

        <button
          onClick={() => scrollToId('projects')}
          className="mt-16 flex items-center gap-2 text-xs tracking-widest text-gray-500 transition-colors hover:text-black"
        >
          <ArrowDown className="h-4 w-4 animate-bounce" />
          SCROLL
        </button>
      </Container>
    </section>
  )
}
