import { motion } from 'framer-motion'
import { ArrowUpRight, Mail } from 'lucide-react'
import { Container } from '@/components/Container'
import { profile } from '@/data/profile'

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-20 bg-white py-24 sm:py-32">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[#f8f8f8] px-8 py-16 sm:px-16 sm:py-24"
        >
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-gradient-to-br from-pink-400 via-orange-300 to-yellow-200 opacity-60 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="mb-3 text-sm tracking-[0.3em] text-gray-500">
              GET IN TOUCH
            </p>
            <h2 className="max-w-2xl text-4xl font-light leading-tight tracking-tight sm:text-6xl">
              함께 만들
              <br />
              이야기가 있다면.
            </h2>

            <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 text-sm text-white transition-transform hover:-translate-y-0.5"
              >
                <Mail className="h-4 w-4" />
                {profile.email}
              </a>
              <a
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/20 px-7 py-3.5 text-sm transition-colors hover:border-black"
              >
                GitHub
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
