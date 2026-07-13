import { Navbar } from '@/components/layout/Navbar'
import { FloatingNav } from '@/components/layout/FloatingNav'
import { Hero } from '@/components/sections/Hero'
import { Projects } from '@/components/sections/Projects'
import { About } from '@/components/sections/About'
import { Footer } from '@/components/layout/Footer'

const homeNav = [
  { id: 'projects', label: 'PROJECTS' },
  { id: 'about', label: 'ABOUT' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <Navbar />
      <FloatingNav items={homeNav} />
      <Hero />
      <Projects />
      <About />
      <Footer />
    </div>
  )
}
