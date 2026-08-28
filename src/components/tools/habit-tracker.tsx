"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Flame, Plus } from "lucide-react";
import { toast } from "sonner";

import { StreakBadge } from "@/components/activities/streak-badge";
import { useEventLogger } from "@/components/tracking/event-tracker-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { playCombo, playHit } from "@/lib/audio/beep";
import {
  archiveHabit,
  createHabit,
  listHabitLogs,
  listHabits,
  toggleHabitLog,
} from "@/lib/services/habits";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Habit = Database["public"]["Tables"]["habits"]["Row"];
type HabitLog = Database["public"]["Tables"]["habit_logs"]["Row"];

const WEEKDAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
// Rachas que valen una celebración extra (sonido distinto + toast), en vez
// de saludar cada día por igual.
const STREAK_MILESTONES = new Set([3, 5, 7]);

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Ventana rodante de los últimos 7 días terminando hoy — nunca hay días
// futuros, así que no hace falta deshabilitar nada en la UI.
function lastSevenDays(): Date[] {
  const days: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function elapsedSince(ref: { current: number }) {
  return Math.round(performance.now() - ref.current);
}

// Racha actual: días consecutivos cumplidos contando hacia atrás desde
// hoy, dentro de la ventana de 7 días visible.
function currentStreak(habitLogs: HabitLog[], days: Date[]) {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const key = toDateKey(days[i]);
    const completed = habitLogs.some((l) => l.log_date === key && l.completed);
    if (!completed) break;
    streak++;
  }
  return streak;
}

export function HabitTracker() {
  const { userId, logEvent } = useEventLogger();
  const [habits, setHabits] = useState<Habit[] | null>(null);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [newName, setNewName] = useState("");

  const days = useMemo(() => lastSevenDays(), []);
  const todayKey = toDateKey(days[days.length - 1]);
  const mountedAtRef = useRef(0);

  useEffect(() => {
    mountedAtRef.current = performance.now();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const from = toDateKey(days[0]);
    const to = toDateKey(days[days.length - 1]);
    Promise.all([
      listHabits(supabase, userId),
      listHabitLogs(supabase, userId, from, to),
    ])
      .then(([h, l]) => {
        setHabits(h);
        setLogs(l);
      })
      .catch(() => {
        toast.error("No se pudieron cargar los hábitos.");
        setHabits([]);
      });
  }, [userId, days]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const supabase = createClient();
    try {
      const habit = await createHabit(supabase, { userId, name });
      setHabits((prev) => [...(prev ?? []), habit]);
      setNewName("");
      toast.success("Hábito creado — marcalo hoy para arrancar la racha.");
      logEvent("tool_progress", {
        tool: "habitos",
        type: "habit_created",
        habitId: habit.id,
      });
    } catch {
      toast.error("No se pudo crear el hábito.");
    }
  }

  async function handleArchive(id: string) {
    setHabits((prev) => (prev ?? []).filter((h) => h.id !== id));
    const supabase = createClient();
    try {
      await archiveHabit(supabase, id);
    } catch {
      toast.error("No se pudo archivar el hábito.");
    }
  }

  // Solo se puede marcar el día de hoy — un hábito se construye con el
  // check-in del momento, no reescribiendo el historial (ver
  // ARCHITECTURE.md §7quater).
  async function handleToggleToday(habit: Habit) {
    const habitLogs = logs.filter((l) => l.habit_id === habit.id);
    const existing = habitLogs.find((l) => l.log_date === todayKey);
    const nextCompleted = !existing?.completed;

    const optimisticLogs = habitLogs
      .filter((l) => l.log_date !== todayKey)
      .concat({
        id: existing?.id ?? `${habit.id}_${todayKey}`,
        habit_id: habit.id,
        user_id: userId,
        log_date: todayKey,
        completed: nextCompleted,
        created_at: existing?.created_at ?? new Date().toISOString(),
      });

    if (nextCompleted) {
      const streak = currentStreak(optimisticLogs, days);
      logEvent("tool_progress", {
        tool: "habitos",
        type: "checkin",
        habitId: habit.id,
        streak,
        latencyMs: elapsedSince(mountedAtRef),
      });
      if (STREAK_MILESTONES.has(streak) || (streak > 7 && streak % 5 === 0)) {
        playCombo();
        toast.success(`🔥 ${streak} días seguidos con "${habit.name}"`);
      } else {
        playHit();
      }
    }

    setLogs((prev) => [
      ...prev.filter((l) => !(l.habit_id === habit.id && l.log_date === todayKey)),
      optimisticLogs[optimisticLogs.length - 1],
    ]);

    const supabase = createClient();
    try {
      await toggleHabitLog(supabase, {
        habitId: habit.id,
        userId,
        logDate: todayKey,
        completed: nextCompleted,
      });
    } catch {
      toast.error("No se pudo actualizar el hábito.");
    }
  }

  if (habits === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Nuevo hábito, p. ej. leer 20 minutos"
        />
        <Button
          className="shrink-0 gap-1.5"
          onClick={handleCreate}
          disabled={!newName.trim()}
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>

      {habits.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <Flame className="mx-auto mb-2 size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Todavía no definiste ningún hábito. Empezá por algo chico y
            concreto — se nota más rápido en la racha.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {habits.map((habit) => {
          const habitLogs = logs.filter((l) => l.habit_id === habit.id);
          const completedCount = habitLogs.filter((l) => l.completed).length;
          const streak = currentStreak(habitLogs, days);
          const todayDone = habitLogs.some(
            (l) => l.log_date === todayKey && l.completed,
          );
          const history = days.slice(0, -1);

          return (
            <Card key={habit.id} className="flex-row items-center gap-3 p-3">
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-medium">{habit.name}</p>
                    <StreakBadge streak={streak} />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {completedCount}/7 esta semana
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {history.map((day) => {
                    const dateKey = toDateKey(day);
                    const isCompleted = habitLogs.some(
                      (l) => l.log_date === dateKey && l.completed,
                    );
                    return (
                      <span
                        key={dateKey}
                        title={`${dateKey} — ${isCompleted ? "cumplido" : "sin marcar"} (historial, no editable)`}
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md text-[9px] font-medium",
                          isCompleted
                            ? "bg-primary/15 text-primary"
                            : "bg-muted/40 text-muted-foreground/70",
                        )}
                      >
                        {WEEKDAY_LETTERS[day.getDay()]}
                      </span>
                    );
                  })}
                  <span className="mx-1 h-4 w-px bg-border" aria-hidden />
                  <button
                    type="button"
                    onClick={() => handleToggleToday(habit)}
                    aria-pressed={todayDone}
                    aria-label={`Marcar "${habit.name}" como hecho hoy`}
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                      todayDone
                        ? "animate-pop border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                        : "border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/15",
                    )}
                  >
                    {todayDone ? <Flame className="size-4" /> : "Hoy"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleArchive(habit.id)}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Archivar hábito"
              >
                <Archive className="size-4" />
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
