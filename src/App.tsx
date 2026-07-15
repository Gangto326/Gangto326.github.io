import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Home from './pages/Home'
import ProjectDetail from './pages/ProjectDetail'
import { cancelManagedScroll } from '@/lib/scroll'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // 이전 페이지에서 진행 중이던 목차 스크롤 보정을 끊고, CSS smooth의 영향을
    // 받지 않게 즉시 이동 — 전환 직후 새 페이지가 반드시 최상단에서 시작한다
    cancelManagedScroll()
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Routes>
    </MotionConfig>
  )
}
