import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f8f8] text-black">
      <header className="flex items-center justify-between p-6">
        <div className="flex space-x-2">
          <div className="h-2 w-2 rounded-full bg-black" />
          <div className="h-2 w-2 rounded-full bg-black" />
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-sm">KO</span>
          <Link to="/#contact" className="text-sm hover:underline">
            CONTACT
          </Link>
          <button className="flex flex-col space-y-1" aria-label="메뉴 열기">
            <span className="h-0.5 w-6 bg-black" />
            <span className="h-0.5 w-6 bg-black" />
          </button>
        </div>
      </header>

      <main className="relative px-6 pt-12">
        {/* Gradient blob */}
        <div
          className="absolute right-0 top-0 h-[300px] w-[300px] animate-pulse rounded-full bg-gradient-to-br from-pink-400 via-orange-300 to-yellow-200 opacity-70 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <p className="mb-6 text-sm tracking-[0.3em] text-gray-500">
            AI · BACKEND ENGINEER
          </p>
          <h1 className="max-w-3xl text-6xl font-light leading-tight tracking-tight">
            I BUILD
            <br />
            EXPERIENCEABLE
            <br />
            SYSTEMS.
          </h1>

          <div className="mt-24 flex flex-wrap justify-between gap-8">
            <div className="max-w-md">
              <Button
                variant="outline"
                className="relative rounded-full border-2 px-8"
              >
                <span className="relative">
                  EXPLORE PROJECTS
                  <span className="absolute -bottom-4 -left-4 -right-4 -top-4 animate-spin-slow rounded-full border border-black opacity-50" />
                </span>
              </Button>
              <p className="mt-8 text-sm leading-relaxed text-gray-600">
                4개의 프로젝트를 직접 클릭하며
                <br />
                이해하는 체험형 포트폴리오.
              </p>
            </div>

            <div className="flex items-end">
              <div className="flex items-center space-x-2">
                <span className="text-sm">김강토 · GANGTO</span>
                <span className="h-px w-12 bg-black" />
              </div>
            </div>
          </div>

          <p className="mt-24 max-w-xl pb-24 text-sm leading-relaxed text-gray-600">
            다중 AI 실시간 파이프라인, 공간 데이터 97% 압축, 센서리스 낙상 감지,
            쓰레드풀 격리 — 문제를 설계로 풀어낸 기록을 인터랙티브 데모로
            직접 확인하세요.
          </p>
        </div>
      </main>
    </div>
  )
}
