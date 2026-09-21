"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { playHit } from "@/lib/audio/beep";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEventsForWeek,
  markCalendarEventCompletion,
} from "@/lib/services/calendar-events";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type CalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-GT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function weeksBetween(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

export function WeeklyCalendar() {
  const { userId, logEvent } = useEventLogger();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [dialogDay, setDialogDay] = useState<Date | null>(null);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isCurrentWeek =
    startOfWeek(new Date()).getTime() === weekStart.getTime();

  useEffect(() => {
    const supabase = createClient();
    const weekEnd = addDays(weekStart, 7);
    listCalendarEventsForWeek(
      supabase,
      userId,
      weekStart.toISOString(),
      weekEnd.toISOString(),
    )
      .then(setEvents)
      .catch(() => {
        toast.error("No se pudieron cargar los eventos.");
        setEvents([]);
      });
  }, [userId, weekStart]);

  function handleNavigateWeek(direction: "prev" | "next" | "today") {
    const next =
      direction === "today"
        ? startOfWeek(new Date())
        : addDays(weekStart, direction === "next" ? 7 : -7);
    logEvent("tool_progress", {
      tool: "calendario",
      type: "week_navigated",
      direction,
      weeksFromToday: weeksBetween(next, startOfWeek(new Date())),
    });
    setWeekStart(next);
  }

  function openDialogFor(day: Date) {
    setDialogDay(day);
    setTitle("");
    setStartTime("09:00");
    setEndTime("10:00");
  }

  async function handleCreate() {
    if (!dialogDay || !title.trim()) return;
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const start = new Date(dialogDay);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(dialogDay);
    end.setHours(endH, endM, 0, 0);

    if (end <= start) {
      toast.error("La hora de fin tiene que ser después de la de inicio.");
      return;
    }

    const supabase = createClient();
    try {
      const event = await createCalendarEvent(supabase, {
        userId,
        title: title.trim(),
        description: null,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });
      setEvents((prev) => [...(prev ?? []), event]);
      setDialogDay(null);
      toast.success("Evento creado");
      logEvent("tool_progress", {
        tool: "calendario",
        type: "event_created",
        leadTimeMs: start.getTime() - Date.now(),
      });
    } catch {
      toast.error("No se pudo crear el evento.");
    }
  }

  async function handleMarkCompletion(id: string, completed: boolean) {
    if (completed) playHit();
    setEvents((prev) =>
      (prev ?? []).map((e) => (e.id === id ? { ...e, completed } : e)),
    );
    logEvent("tool_progress", {
      tool: "calendario",
      type: "reflection",
      eventId: id,
      completed,
    });
    const supabase = createClient();
    try {
      await markCalendarEventCompletion(supabase, id, completed);
    } catch {
      toast.error("No se pudo registrar la respuesta.");
    }
  }

  async function handleDelete(id: string) {
    setEvents((prev) => (prev ?? []).filter((e) => e.id !== id));
    const supabase = createClient();
    try {
      await deleteCalendarEvent(supabase, id);
    } catch {
      toast.error("No se pudo borrar el evento.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => handleNavigateWeek("prev")}
        >
          <ChevronLeft className="size-4" />
          Semana anterior
        </Button>
        <div className="flex items-center gap-2">
          <p className="font-heading text-base font-semibold text-foreground">
            {weekStart.toLocaleDateString("es-GT", {
              day: "numeric",
              month: "short",
            })}{" "}
            –{" "}
            {addDays(weekStart, 6).toLocaleDateString("es-GT", {
              day: "numeric",
              month: "short",
            })}
          </p>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => handleNavigateWeek("today")}
              className="rounded-full border border-primary/40 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              Hoy
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => handleNavigateWeek("next")}
        >
          Semana siguiente
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {events === null ? (
        <div className="grid gap-3 sm:grid-cols-7">
          {WEEKDAY_LABELS.map((label) => (
            <Skeleton key={label} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-7">
          {weekDays.map((day, i) => {
            const isToday =
              day.toDateString() === new Date().toDateString();
            const dayEvents = events
              .filter(
                (e) => new Date(e.start_at).toDateString() === day.toDateString(),
              )
              .sort((a, b) => a.start_at.localeCompare(b.start_at));
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "space-y-2 rounded-xl border border-border bg-muted/20 p-2",
                  isToday && "border-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between px-0.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    {WEEKDAY_LABELS[i]} {day.getDate()}
                    {isToday && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary-foreground">
                        HOY
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => openDialogFor(day)}
                    className="text-muted-foreground transition-colors hover:text-primary"
                    aria-label="Agregar evento"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {dayEvents.length === 0 && (
                    <p className="py-2 text-center text-[10px] italic text-muted-foreground/60">
                      Libre
                    </p>
                  )}
                  {dayEvents.map((event) => {
                    const isPast = new Date(event.end_at) < new Date();
                    const needsReflection = isPast && event.completed === null;
                    return (
                      <Card
                        key={event.id}
                        className="gap-1 p-2 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p
                            className={cn(
                              "text-xs font-medium",
                              event.completed === false &&
                                "text-muted-foreground line-through",
                            )}
                          >
                            {event.title}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleDelete(event.id)}
                            className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                            aria-label="Borrar evento"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                        {needsReflection ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-muted-foreground">
                              ¿Lo hiciste?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMarkCompletion(event.id, true)}
                              aria-label="Sí, lo hice"
                              className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                            >
                              <Check className="size-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkCompletion(event.id, false)}
                              aria-label="No lo hice"
                              className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                              event.completed === true &&
                                "bg-primary/15 text-primary",
                              event.completed === false &&
                                "bg-muted text-muted-foreground",
                              event.completed === null &&
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {event.completed === true && (
                              <Check className="size-2.5" />
                            )}
                            {timeLabel(event.start_at)}–{timeLabel(event.end_at)}
                          </span>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog
        open={dialogDay !== null}
        onOpenChange={(open) => !open && setDialogDay(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Nuevo evento
              {dialogDay &&
                ` — ${dialogDay.toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "short" })}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-title">Título</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="p. ej. Estudiar para el parcial"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-start">Inicio</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-end">Fin</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreate} disabled={!title.trim()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
