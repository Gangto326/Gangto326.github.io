import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Container } from '@/components/Container'
import { scrollToId } from '@/lib/scroll'

const PROFILE_SRC = `${import.meta.env.BASE_URL}assets/profile.jpg`

export function Hero() {
  return (
    <section id="top" className="bg-[#f8f8f8] text-black">
      <Container className="pb-24 pt-10 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* 좌: 텍스트 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="order-2 lg:order-1"
          >
            <p className="mb-6 text-sm tracking-[0.3em] text-gray-500">
              AI · BACKEND ENGINEER
            </p>
            <h1 className="text-5xl font-light leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
              I BUILD
              <br />
              SYSTEMS YOU
              <br />
              CAN EXPERIENCE.
            </h1>

            <div className="mt-10">
              <Button
                variant="outline"
                onClick={() => scrollToId('projects')}
                className="relative rounded-full border-2 px-8"
              >
                <span className="relative">
                  EXPLORE PROJECTS
                  <span className="absolute -bottom-4 -left-4 -right-4 -top-4 animate-spin-slow rounded-full border border-black opacity-40" />
                </span>
              </Button>
              <p className="mt-8 max-w-md text-sm leading-relaxed text-gray-600">
                4개의 프로젝트를 직접 클릭하며 이해하는 체험형 포트폴리오.
                다중 AI 파이프라인부터 공간 데이터 압축까지, 문제를 설계로
                풀어낸 기록을 인터랙티브 데모로 확인하세요.
              </p>

              <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs tracking-widest text-gray-500">
                <span>
                  <strong className="font-medium text-black">4</strong> PROJECTS
                </span>
                <span>
                  <strong className="font-medium text-black">AI</strong> +
                  BACKEND
                </span>
                <span>
                  SSAFY 우수상{' '}
                  <strong className="font-medium text-black">1등</strong> 다수
                </span>
              </div>
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
