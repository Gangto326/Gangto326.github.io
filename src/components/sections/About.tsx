import { motion } from 'framer-motion'
import { Container } from '@/components/Container'
import { profile } from '@/data/profile'

export function About() {
  return (
    <section id="about" className="scroll-mt-20 bg-[#f8f8f8] py-24 sm:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 text-sm tracking-[0.3em] text-gray-500">
              WHO I AM
            </p>
            <h2 className="text-4xl font-light tracking-tight sm:text-5xl">
              ABOUT
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-gray-500">
              {profile.name} · {profile.role}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-4">
              {profile.bio.map((line, i) => (
                <p key={i} className="text-base leading-relaxed text-gray-700">
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-10">
              <p className="mb-4 text-xs tracking-[0.2em] text-gray-400">
                SKILLS
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-gray-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <p className="mb-4 text-xs tracking-[0.2em] text-gray-400">
                AWARDS & CERTIFICATES
              </p>
              <ul className="divide-y divide-black/5 border-t border-black/5">
                {profile.awards.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-baseline gap-4 py-3 text-sm"
                  >
                    <span className="w-12 shrink-0 text-gray-400">{a.year}</span>
                    <span className="text-gray-700">{a.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}
