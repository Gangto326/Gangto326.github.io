import { motion } from 'framer-motion'
import { Container } from '@/components/Container'
import { profile } from '@/data/profile'

export function About() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-border bg-background py-24 sm:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mb-3 flex items-center gap-3 text-xs font-medium tracking-widest text-muted-foreground">
              <span className="h-px w-8 bg-foreground/30" aria-hidden="true" />
              WHO I AM
            </p>
            <h2 className="text-4xl font-semibold tracking-tighter sm:text-5xl">
              ABOUT
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
              {profile.name} · {profile.role}
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="space-y-5">
              {profile.bio.map((line, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? 'text-balance text-lg font-medium leading-relaxed text-foreground sm:text-xl'
                      : 'text-base leading-relaxed text-muted-foreground'
                  }
                >
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-12">
              <p className="mb-4 text-xs font-medium tracking-widest text-muted-foreground">
                SKILLS
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-card-foreground shadow-sm"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-12">
              <p className="mb-4 text-xs font-medium tracking-widest text-muted-foreground">
                AWARDS &amp; CERTIFICATES
              </p>
              <ul className="divide-y divide-border border-t border-border">
                {profile.awards.map((a, i) => (
                  <li key={i} className="flex items-baseline gap-4 py-3 text-sm">
                    <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{a.year}</span>
                    <span className="text-foreground">{a.title}</span>
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
