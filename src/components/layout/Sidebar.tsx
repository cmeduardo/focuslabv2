'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Timer,
  CheckSquare,
  Calendar,
  Flame,
  BarChart2,
  Settings,
  Brain,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

// Elementos de navegación del sidebar
const navItems = [
  {
    section: 'Principal',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Herramientas',
    items: [
      { href: '/tools/pomodoro', label: 'Pomodoro', icon: Timer },
      { href: '/tools/tasks', label: 'Tareas', icon: CheckSquare },
      { href: '/tools/habits', label: 'Hábitos', icon: Flame },
      { href: '/tools/calendar', label: 'Calendario', icon: Calendar },
    ],
  },
  {
    section: 'Actividades',
    items: [
      { href: '/activities', label: 'Actividades', icon: Brain },
    ],
  },
  {
    section: 'Análisis',
    items: [
      { href: '/reports', label: 'Reportes', icon: BarChart2 },
      { href: '/settings', label: 'Ajustes', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden md:flex flex-col h-screen bg-[#1A1A2E] border-r border-white/5 sticky top-0 overflow-hidden shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/5">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xl font-bold bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent"
          >
            FocusLab
          </motion.span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {navItems.map((section) => (
          <div key={section.section} className="mb-6">
            {!collapsed && (
              <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {section.section}
              </p>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
                    isActive
                      ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {/* Indicador activo */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 w-0.5 h-6 bg-[#8B5CF6] rounded-full"
                      style={{ left: '-8px' }}
                    />
                  )}
                  <Icon
                    size={20}
                    className={cn(
                      'shrink-0 transition-colors',
                      isActive ? 'text-[#8B5CF6]' : 'text-slate-400 group-hover:text-white'
                    )}
                  />
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-slate-800 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>
    </motion.aside>
  )
}
