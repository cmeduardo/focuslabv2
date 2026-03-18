import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'FocusLab — Analiza tu atención',
  description: 'Mide y mejora tus patrones de atención con herramientas de productividad y actividades cognitivas.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-[#0F0F1A] text-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  )
}
