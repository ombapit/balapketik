import './globals.css'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'BalapKetik',
  description: 'Typing race bareng teman',
  icons: { icon: '/balapketik-favicon.png', apple: '/balapketik-favicon.png' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="id"><body>{children}</body></html>
}
