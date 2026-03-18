'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Zap, Brain, BarChart2, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

// Navegación inferior para dispositivos móviles
const mobileNavItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/tools/pomodoro', label: 'Tools', icon: Zap },
  { href: '/activities', label: 'Focus', icon: Brain },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/settings', label: 'Config', icon: Settings },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#1A1A2E]/90 backdrop-blur-md border-t border-white/5">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all',
                isActive ? 'text-[#8B5CF6]' : 'text-slate-500'
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
