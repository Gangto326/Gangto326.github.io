import { ArrowUp } from 'lucide-react'
import { Container } from '@/components/Container'
import { profile } from '@/data/profile'
import { scrollToId } from '@/lib/scroll'

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white py-10">
      <Container className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-gray-400">
          © 2026 {profile.name} · {profile.nameEn}
        </p>
        <button
          onClick={() => scrollToId('top')}
          className="flex items-center gap-1.5 text-xs tracking-widest text-gray-500 transition-colors hover:text-black"
        >
          BACK TO TOP
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </Container>
    </footer>
  )
}
