"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Sparkles, Square } from "lucide-react";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { playHit, playLevelUp } from "@/lib/audio/beep";
import {
  endPomodoroSession,
  incrementPomodoroCycle,
  startPomodoroSession,
} from "@/lib/services/pomodoro";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Phase = "idle" | "work" | "break" | "ready" | "finished";

const RING_RADIUS = 96;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function PomodoroTimer() {
  const { sessionId, userId, logEvent } = useEventLogger();
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [targetCycles, setTargetCycles] = useState(4);
  const [phase, setPhase] = useState<Phase>("idle");
  const [paused, setPaused] = useState(false);
  const [remainingDisplay, setRemainingDisplay] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [pauseCount, setPauseCount] = useState(0);
  const [pausedMs, setPausedMs] = useState(0);

  const remainingRef = useRef(0);
  const cyclesRef = useRef(0);
  const pomodoroIdRef = useRef<string | null>(null);
  const pauseCountRef = useRef(0);
  const pausedMsRef = useRef(0);
  const pauseStartedAtRef = useRef<number | null>(null);
  const phaseStartedAtRef = useRef(0);
  const readyShownAtRef = useRef(0);

  // Cierra cualquier pausa abierta y devuelve el total acumulado — se usa
  // en todos los caminos que persisten la sesión (detener, terminar,
  // desmontar), para que la última pausa en curso también cuente.
  function closeOpenPause() {
    if (pauseStartedAtRef.current !== null) {
      pausedMsRef.current += performance.now() - pauseStartedAtRef.current;
      pauseStartedAtRef.current = null;
    }
    const rounded = Math.round(pausedMsRef.current);
    setPausedMs(rounded);
    return rounded;
  }

  // Cuenta regresiva: 1 tick/segundo alcanza, no hace falta rAF. El
  // intervalo se recrea en cada cambio de fase (work<->break), y toda la
  // lógica de transición (incluyendo el cierre al llegar a los ciclos
  // programados) vive dentro del callback del setInterval, nunca
  // sincrónicamente en el cuerpo del efecto.
  useEffect(() => {
    if (phase === "idle" || phase === "finished" || phase === "ready" || paused) {
      return;
    }
    const interval = setInterval(() => {
      remainingRef.current -= 1;
      if (remainingRef.current <= 0) {
        const wallMs = Math.round(performance.now() - phaseStartedAtRef.current);
        if (phase === "work") {
          const nextCycles = cyclesRef.current + 1;
          cyclesRef.current = nextCycles;
          setCycles(nextCycles);
          if (pomodoroIdRef.current) {
            const supabase = createClient();
            void incrementPomodoroCycle(supabase, pomodoroIdRef.current, nextCycles);
          }
          logEvent("tool_progress", {
            tool: "pomodoro",
            type: "work_complete",
            cycleIndex: nextCycles,
            wallMs,
          });
          playHit();
          phaseStartedAtRef.current = performance.now();
          remainingRef.current = breakMinutes * 60;
          setPhase("break");
        } else {
          logEvent("tool_progress", {
            tool: "pomodoro",
            type: "break_complete",
            cycleIndex: cyclesRef.current,
            wallMs,
          });
          if (cyclesRef.current >= targetCycles) {
            // Se cumplieron los ciclos programados: cierra solo, con el
            // descanso del último ciclo ya completo.
            const id = pomodoroIdRef.current;
            pomodoroIdRef.current = null;
            if (id) {
              const supabase = createClient();
              void endPomodoroSession(supabase, id, {
                interrupted: false,
                pauseCount: pauseCountRef.current,
                pausedMs: closeOpenPause(),
              });
            }
            playLevelUp();
            setPhase("finished");
          } else {
            // En vez de arrancar el próximo bloque solo, espera a que el
            // participante vuelva a interactuar — mide cuánto tarda en
            // re-comprometerse después del descanso (tool_progress
            // "cycle_resume" al tocar "Empezar ciclo").
            readyShownAtRef.current = performance.now();
            setPhase("ready");
          }
        }
      }
      setRemainingDisplay(remainingRef.current);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, paused, workMinutes, breakMinutes, targetCycles, logEvent]);

  // Best-effort: si el participante navega a otra página con un bloque
  // corriendo, igual queda marcado como interrumpido.
  useEffect(() => {
    return () => {
      if (pomodoroIdRef.current) {
        const supabase = createClient();
        void endPomodoroSession(supabase, pomodoroIdRef.current, {
          interrupted: true,
          pauseCount: pauseCountRef.current,
          pausedMs: closeOpenPause(),
        });
      }
    };
  }, []);

  async function handleStart() {
    const supabase = createClient();
    try {
      const id = await startPomodoroSession(supabase, {
        userId,
        sessionId,
        workMinutes,
        breakMinutes,
      });
      pomodoroIdRef.current = id;
    } catch {
      return;
    }
    cyclesRef.current = 0;
    setCycles(0);
    pauseCountRef.current = 0;
    pausedMsRef.current = 0;
    pauseStartedAtRef.current = null;
    setPauseCount(0);
    setPausedMs(0);
    remainingRef.current = workMinutes * 60;
    setRemainingDisplay(remainingRef.current);
    setPaused(false);
    phaseStartedAtRef.current = performance.now();
    setPhase("work");
  }

  // Llegar acá implica que la sesión no llegó a "finished" por su
  // cuenta (sea cual sea la fase — incluso "ready", donde el reloj ya
  // está en 0 pero no arrancó el siguiente bloque) — siempre cuenta como
  // interrumpida.
  async function handleStop() {
    const id = pomodoroIdRef.current;
    pomodoroIdRef.current = null;
    setPhase("idle");
    setPaused(false);
    if (id) {
      const supabase = createClient();
      void endPomodoroSession(supabase, id, {
        interrupted: true,
        pauseCount: pauseCountRef.current,
        pausedMs: closeOpenPause(),
      });
    }
    logEvent("tool_interrupt", { tool: "pomodoro" });
  }

  function handleBeginNextCycle() {
    const latencyMs = Math.round(performance.now() - readyShownAtRef.current);
    logEvent("tool_progress", {
      tool: "pomodoro",
      type: "cycle_resume",
      cycleIndex: cyclesRef.current + 1,
      latencyMs,
    });
    phaseStartedAtRef.current = performance.now();
    remainingRef.current = workMinutes * 60;
    setRemainingDisplay(remainingRef.current);
    setPhase("work");
  }

  function handleTogglePause() {
    const next = !paused;
    if (next) {
      pauseCountRef.current += 1;
      setPauseCount(pauseCountRef.current);
      pauseStartedAtRef.current = performance.now();
    } else {
      closeOpenPause();
    }
    setPaused(next);
  }

  const totalForPhase = (phase === "work" ? workMinutes : breakMinutes) * 60;
  // El anillo se deriva de remainingDisplay (estado, no un temporizador
  // CSS aparte) — a diferencia de una transición de ancho fija en
  // segundos, esto respeta la pausa: si remainingDisplay deja de
  // actualizarse, el anillo se queda quieto en vez de seguir animando.
  const ringProgress =
    totalForPhase > 0
      ? Math.max(0, Math.min(1, remainingDisplay / totalForPhase))
      : 0;
  const ringDashOffset = RING_CIRCUMFERENCE * ringProgress;

  if (phase === "idle") {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Pomodoro</CardTitle>
          <CardDescription>
            Programá cuántos ciclos de trabajo/descanso querés hacer — se
            cierra solo al completarlos y te muestra el resumen (o parálo
            cuando quieras antes).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="work-minutes">Trabajo (min)</Label>
            <Input
              id="work-minutes"
              type="number"
              min={1}
              max={120}
              value={workMinutes}
              onChange={(e) =>
                setWorkMinutes(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="break-minutes">Descanso (min)</Label>
            <Input
              id="break-minutes"
              type="number"
              min={1}
              max={60}
              value={breakMinutes}
              onChange={(e) =>
                setBreakMinutes(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="target-cycles">Ciclos</Label>
            <Input
              id="target-cycles"
              type="number"
              min={1}
              max={12}
              value={targetCycles}
              onChange={(e) =>
                setTargetCycles(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full gap-1.5" onClick={handleStart}>
            <Play className="size-4" />
            Iniciar
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (phase === "finished") {
    const totalWorkMin = cycles * workMinutes;
    const totalBreakMin = cycles * breakMinutes;
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <span className="mx-auto mb-1 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <Sparkles className="size-5" />
          </span>
          <CardTitle className="font-heading text-xl">
            ¡Pomodoro completado!
          </CardTitle>
          <CardDescription>
            Hiciste {cycles} {cycles === 1 ? "ciclo" : "ciclos"} de{" "}
            {workMinutes}/{breakMinutes} minutos, tal como lo programaste.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">
                Ciclos completados
              </dt>
              <dd className="font-heading text-lg font-semibold">{cycles}</dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">
                Tiempo enfocado
              </dt>
              <dd className="font-heading text-lg font-semibold">
                {totalWorkMin} min
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">
                Tiempo de descanso
              </dt>
              <dd className="font-heading text-lg font-semibold">
                {totalBreakMin} min
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <dt className="text-xs text-muted-foreground">Tiempo total</dt>
              <dd className="font-heading text-lg font-semibold">
                {totalWorkMin + totalBreakMin} min
              </dd>
            </div>
          </dl>
          {pauseCount > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Pausaste {pauseCount} {pauseCount === 1 ? "vez" : "veces"} (
              {Math.max(1, Math.round(pausedMs / 60000))} min en pausa) — no
              se cuenta como tiempo enfocado.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full gap-1.5"
            onClick={() => setPhase("idle")}
          >
            <Play className="size-4" />
            Empezar otro
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (phase === "ready") {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardHeader>
          <span className="mx-auto mb-1 flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
            <Play className="size-5" />
          </span>
          <CardTitle className="font-heading text-xl">
            Descanso terminado
          </CardTitle>
          <CardDescription>
            ¿Listo para el ciclo {cycles + 1} de {targetCycles}? Arrancá
            cuando quieras — no hay apuro.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-1.5"
            onClick={handleStop}
          >
            <Square className="size-4" />
            Detener acá
          </Button>
          <Button className="flex-1 gap-1.5" onClick={handleBeginNextCycle}>
            <Play className="size-4" />
            Empezar ciclo
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md text-center">
      <CardHeader>
        <CardTitle className="font-heading text-xl">
          {phase === "work" ? "Bloque de trabajo" : "Descanso"}
        </CardTitle>
        <CardDescription>
          Ciclo {cycles + (phase === "work" ? 1 : 0)} de {targetCycles}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "relative mx-auto flex size-56 items-center justify-center transition-opacity",
            paused && "opacity-60",
          )}
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 224 224">
            <circle
              cx={112}
              cy={112}
              r={RING_RADIUS}
              strokeWidth={10}
              className="fill-none stroke-muted"
            />
            <circle
              cx={112}
              cy={112}
              r={RING_RADIUS}
              strokeWidth={10}
              strokeLinecap="round"
              className={cn(
                "fill-none",
                phase === "work" ? "stroke-primary" : "stroke-pulse",
              )}
              style={{
                strokeDasharray: RING_CIRCUMFERENCE,
                strokeDashoffset: ringDashOffset,
                transition: "stroke-dashoffset 0.9s linear",
              }}
            />
          </svg>
          <div className="relative text-center">
            <p className="font-heading text-4xl font-semibold tabular-nums">
              {formatTime(remainingDisplay)}
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {paused
                ? "En pausa"
                : phase === "work"
                  ? "Enfocado"
                  : "Respirá un poco"}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={handleTogglePause}
        >
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
          {paused ? "Reanudar" : "Pausar"}
        </Button>
        <Button
          variant="destructive"
          className="flex-1 gap-1.5"
          onClick={handleStop}
        >
          <Square className="size-4" />
          Detener
        </Button>
      </CardFooter>
    </Card>
  );
}
