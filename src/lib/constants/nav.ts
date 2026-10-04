import {
  BookOpen,
  CalendarDays,
  Flame,
  Grid3x3,
  KanbanSquare,
  Search,
  Target,
  Timer,
  Type,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { ActivityType } from "@/lib/types/database";

export const PARTICIPANT_NAV = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/actividades", label: "Actividades" },
  { href: "/herramientas", label: "Herramientas" },
  { href: "/informes", label: "Mis informes" },
] as const;

export const ADMIN_NAV = [
  { href: "/admin", label: "Panel agregado" },
  { href: "/admin/participantes", label: "Participantes" },
] as const;

export const ACTIVITIES: {
  slug: ActivityType;
  name: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    slug: "reaction_test",
    name: "Reaction Test",
    description: "Alerta: reacciona a una señal que llega sin aviso.",
    icon: Zap,
  },
  {
    slug: "focus_flow",
    name: "Focus Flow",
    description: "Atención sostenida: mantén el ritmo y frena a tiempo.",
    icon: Target,
  },
  {
    slug: "memory_matrix",
    name: "Memory Matrix",
    description: "Memoria de trabajo: repite secuencias cada vez más largas.",
    icon: Grid3x3,
  },
  {
    slug: "word_sprint",
    name: "Word Sprint",
    description: "Atención selectiva: el color de la tinta, no la palabra.",
    icon: Type,
  },
  {
    slug: "pattern_hunt",
    name: "Pattern Hunt",
    description: "Búsqueda visual: encuentra la figura entre muchas parecidas.",
    icon: Search,
  },
  {
    slug: "deep_read",
    name: "Deep Read",
    description: "Lectura con interrupciones: ¿cuánto retienes?",
    icon: BookOpen,
  },
];

export const TOOLS: {
  slug: string;
  name: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    slug: "pomodoro",
    name: "Pomodoro",
    description: "Temporizador configurable de bloques de trabajo y descanso.",
    icon: Timer,
  },
  {
    slug: "kanban",
    name: "Kanban",
    description: "Tablero personal: pendiente / en progreso / completado.",
    icon: KanbanSquare,
  },
  {
    slug: "habitos",
    name: "Hábitos",
    description: "Seguimiento diario de hábitos definidos por ti.",
    icon: Flame,
  },
  {
    slug: "calendario",
    name: "Calendario",
    description: "Calendario semanal de actividades.",
    icon: CalendarDays,
  },
];
