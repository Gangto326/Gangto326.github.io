import { Navbar } from '@/components/layout/Navbar'
import { Hero } from '@/components/sections/Hero'
import { Projects } from '@/components/sections/Projects'
import { About } from '@/components/sections/About'
import { Footer } from '@/components/layout/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <Navbar />
      <Hero />
      <Projects />
      <About />
      <Footer />
    </div>
  )
}
