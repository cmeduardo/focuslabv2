"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CloudOff, Play, RotateCcw, Smartphone, Sparkles, Volume2, VolumeX, X } from "lucide-react";

import { useEventLogger } from "@/components/tracking/event-tracker-provider";
import { Button } from "@/components/ui/button";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { PROTOCOL_VERSION, SHELL_CONFIG } from "@/lib/activities/config";
import { captureDeviceContext, countInputs } from "@/lib/activities/device-context";
import type {
  ActivitySummary,
  DeviceContext,
  JsonObject,
  RoundMode,
  TrialRecord,
} from "@/lib/activities/types";
import {
  beaconRunIncomplete,
  markRunIncomplete,
  queuePendingRun,
  saveCompletedRun,
  startActivityRun,
  withRetry,
  type CompletedRunPayload,
} from "@/lib/services/activity-runs";
import {
  isSoundMuted,
  playComplete,
  playCountdownTick,
  playGo,
  playLevelUp,
  setSoundMuted,
  unlockAudio,
} from "@/lib/audio/beep";
import { createClient } from "@/lib/supabase/client";
import type { ActivityType } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export type RoundProps = {
  mode: RoundMode;
  // performance.now() al iniciar la ronda: origen de todos los tiempos.
  origin: number;
  onComplete: (trials: TrialRecord[]) => void;
};

// Estados de una actividad (diagrama de estados del capítulo 5):
// instrucciones → práctica → práctica lista (repetir 1 vez) → cuenta
// regresiva → en curso → guardando → completada. "Incompleta" no es una
// pantalla: es el estado en que queda la corrida en la base si se sale o
// se cierra la página durante "en curso".
type Stage =
  | "instructions"
  | "practice"
  | "practice_done"
  | "countdown"
  | "running"
  | "saving"
  | "completed";

type SaveStatus = "saved" | "queued";

const IMMERSIVE: Stage[] = ["practice", "countdown", "running"];

/**
 * Motor común de las seis actividades: instrucciones, práctica (no se
 * guarda), cuenta regresiva, ronda registrada a pantalla completa,
 * visibilidad, wake lock, contexto de dispositivo y envío final en lote.
 * Cada actividad solo aporta su `Round` (estímulos y reglas) y su función
 * pura `summarize` (métricas).
 */
export function ActivityShell({
  activityType,
  title,
  icon: Icon,
  tagline,
  instructions,
  inputHint,
  config,
  requiresPortrait = false,
  Round,
  summarize,
  resultStats,
}: {
  activityType: ActivityType;
  title: string;
  icon: LucideIcon;
  tagline: string;
  instructions: string[];
  inputHint: string;
  config: JsonObject;
  requiresPortrait?: boolean;
  Round: React.ComponentType<RoundProps>;
  summarize: (trials: TrialRecord[]) => ActivitySummary;
  resultStats: (summary: ActivitySummary) => { label: string; value: string }[];
}) {
  const router = useRouter();
  const { sessionId, userId, logEvent } = useEventLogger();
  const supabase = useMemo(() => createClient(), []);

  const [stage, setStage] = useState<Stage>("instructions");
  const [practiceRounds, setPracticeRounds] = useState(0);
  const [origin, setOrigin] = useState(0);
  const [roundKey, setRoundKey] = useState(0);
  const [countdown, setCountdown] = useState<number>(SHELL_CONFIG.countdownSeconds);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [muted, setMuted] = useState(false);

  const runIdRef = useRef<string | null>(null);
  const runningRef = useRef(false);
  const startedAtRef = useRef("");
  const visibilityLossesRef = useRef(0);
  const devicePromiseRef = useRef<Promise<DeviceContext> | null>(null);

  // La preferencia de sonido vive en localStorage: se lee al montar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMuted(isSoundMuted());
  }, []);
  const toggleSound = useCallback(() => {
    unlockAudio();
    setMuted((m) => {
      setSoundMuted(!m);
      return !m;
    });
  }, []);

  const immersive = IMMERSIVE.includes(stage);
  useWakeLock(immersive);
  const landscapeBlocked = useLandscapeBlock(requiresPortrait && immersive);

  // Pantalla completa sin scroll ni rebote mientras dura la actividad.
  useEffect(() => {
    if (!immersive) return;
    const root = document.documentElement;
    const prev = [root.style.overflow, root.style.overscrollBehavior];
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    return () => {
      [root.style.overflow, root.style.overscrollBehavior] = prev;
    };
  }, [immersive]);

  // Clic fantasma en táctil: las respuestas se toman en pointerdown, y si
  // esa respuesta cierra la capa de pantalla completa, el navegador igual
  // dispara después el click sintético sobre lo que quedó debajo (p. ej. la
  // barra de navegación inferior). Ese click no viene precedido de un
  // pointerdown propio: se descarta solo si llega antes de cualquier toque
  // nuevo (un toque real en "Comenzar el reto" sí pasa).
  const wasImmersiveRef = useRef(false);
  useEffect(() => {
    const closed = wasImmersiveRef.current && !immersive;
    wasImmersiveRef.current = immersive;
    if (!closed) return;
    const stop = () => {
      document.removeEventListener("click", swallow, true);
      document.removeEventListener("pointerdown", stop, true);
    };
    const swallow = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      stop();
    };
    document.addEventListener("click", swallow, true);
    document.addEventListener("pointerdown", stop, true);
    const timer = setTimeout(stop, 800);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [immersive]);

  const startPractice = useCallback(() => {
    // Desde un click: iOS solo habilita el audio dentro de un gesto así.
    unlockAudio();
    setPracticeRounds((n) => n + 1);
    setOrigin(performance.now());
    setRoundKey((k) => k + 1);
    setConfirmExit(false);
    setStage("practice");
  }, []);

  const startCountdown = useCallback(() => {
    // La medición de refresco (rAF) corre durante la cuenta regresiva, no
    // durante los ensayos.
    unlockAudio();
    devicePromiseRef.current = captureDeviceContext(SHELL_CONFIG.refreshSampleFrames);
    setCountdown(SHELL_CONFIG.countdownSeconds);
    setConfirmExit(false);
    setStage("countdown");
  }, []);

  const beginRegistered = useCallback(() => {
    const runId = crypto.randomUUID();
    runIdRef.current = runId;
    runningRef.current = true;
    startedAtRef.current = new Date().toISOString();
    visibilityLossesRef.current = 0;
    void startActivityRun(supabase, {
      runId,
      sessionId,
      userId,
      activityType,
      protocolVersion: PROTOCOL_VERSION,
      practiceRounds,
      config,
    }).catch(() => undefined);
    logEvent("activity_start", {
      activity_type: activityType,
      run_id: runId,
      protocol_version: PROTOCOL_VERSION,
    });
    setOrigin(performance.now());
    setRoundKey((k) => k + 1);
    setStage("running");
  }, [supabase, sessionId, userId, activityType, practiceRounds, config, logEvent]);

  useEffect(() => {
    if (stage !== "countdown") return;
    playCountdownTick();
  }, [stage, countdown]);

  useEffect(() => {
    if (stage === "running") playGo();
    if (stage === "practice_done") playLevelUp();
    if (stage === "completed") playComplete();
  }, [stage]);

  useEffect(() => {
    if (stage !== "countdown") return;
    const timer = setTimeout(() => {
      if (countdown <= 1) beginRegistered();
      else setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [stage, countdown, beginRegistered]);

  // Durante la ronda registrada: contar pérdidas de visibilidad y, si se
  // cierra la página, marcar la corrida como incompleta.
  useEffect(() => {
    if (stage !== "running") return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") visibilityLossesRef.current += 1;
    };
    const onPageHide = () => {
      if (runningRef.current && runIdRef.current) beaconRunIncomplete(runIdRef.current);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [stage]);

  const abandonRun = useCallback(() => {
    if (!runningRef.current || !runIdRef.current) return;
    runningRef.current = false;
    void markRunIncomplete(supabase, runIdRef.current);
    logEvent("activity_end", {
      activity_type: activityType,
      run_id: runIdRef.current,
      status: "incompleta",
    });
  }, [supabase, logEvent, activityType]);

  // Navegación dentro de la app a mitad de la ronda (botón atrás): solo al
  // desmontar de verdad, sin depender de la identidad del callback.
  const abandonRef = useRef(abandonRun);
  useEffect(() => {
    abandonRef.current = abandonRun;
  }, [abandonRun]);
  useEffect(() => () => abandonRef.current(), []);

  const handlePracticeComplete = useCallback(() => {
    // Los ensayos de práctica se descartan: nunca llegan a la base ni a n8n.
    setStage("practice_done");
  }, []);

  const handleRegisteredComplete = useCallback(
    async (trials: TrialRecord[]) => {
      const runId = runIdRef.current;
      if (!runningRef.current || !runId) return;
      runningRef.current = false;
      const durationMs = performance.now() - origin;
      const endedAt = new Date().toISOString();
      const result = summarize(trials);
      setSummary(result);
      setStage("saving");

      const device =
        (await devicePromiseRef.current) ??
        (await captureDeviceContext(SHELL_CONFIG.refreshSampleFrames));
      const { counts, primary } = countInputs(trials);
      const payload: CompletedRunPayload = {
        runId,
        sessionId,
        userId,
        activityType,
        protocolVersion: PROTOCOL_VERSION,
        startedAt: startedAtRef.current,
        endedAt,
        practiceRounds,
        config,
        device,
        inputCounts: counts,
        inputPrimary: primary,
        visibilityLosses: visibilityLossesRef.current,
        trials,
        durationMs,
        accuracy: result.accuracy,
        levelReached: result.levelReached,
        metrics: { ...result.metrics, report: result.report },
      };

      try {
        await withRetry(
          () => saveCompletedRun(supabase, payload),
          SHELL_CONFIG.saveAttempts,
          SHELL_CONFIG.saveRetryBaseMs,
        );
        setSaveStatus("saved");
      } catch (error) {
        console.error("No se pudo guardar la corrida; queda en cola local.", error);
        queuePendingRun(payload);
        setSaveStatus("queued");
      }
      logEvent("activity_end", {
        activity_type: activityType,
        run_id: runId,
        duration_ms: Math.round(durationMs),
        status: "completada",
      });
      setStage("completed");
    },
    [origin, summarize, sessionId, userId, activityType, practiceRounds, config, supabase, logEvent],
  );

  const exitImmersive = useCallback(() => {
    if (stage === "practice") {
      setStage("instructions");
      return;
    }
    abandonRun();
    router.push("/actividades");
  }, [stage, abandonRun, router]);

  const restart = useCallback(() => {
    setSummary(null);
    setSaveStatus(null);
    setPracticeRounds(0);
    setStage("instructions");
  }, []);

  return (
    <div className="space-y-6">
      <Link
        href="/actividades"
        className="inline-flex min-h-12 items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Desafíos
      </Link>
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="mx-auto w-full max-w-md">
        {stage === "instructions" && (
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="text-muted-foreground">{tagline}</p>
            <ol className="mt-4 space-y-3 text-[15px]">
              {instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
              {inputHint} Primero harás una ronda corta de práctica.
            </p>
            <Button size="lg" className="mt-5 h-12 w-full gap-2 text-base" onClick={startPractice}>
              <Play className="size-4" />
              Empezar práctica
            </Button>
          </section>
        )}

        {stage === "practice_done" && (
          <section data-testid="practice-done" className="rounded-2xl border border-border bg-card p-5 text-center sm:p-6">
            <h2 className="font-heading text-xl font-semibold">¡Práctica lista!</h2>
            <p className="mt-2 text-muted-foreground">
              Ahora viene la ronda que cuenta. Durante el reto no verás si
              aciertas o no, pero cada respuesta destella y suena al quedar
              registrada. ¡Da lo mejor de ti!
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button size="lg" className="h-12 w-full gap-2 text-base" onClick={startCountdown}>
                <Play className="size-4" />
                Comenzar el reto
              </Button>
              {practiceRounds < SHELL_CONFIG.maxPracticeRounds && (
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full gap-2 text-base"
                  onClick={startPractice}
                >
                  <RotateCcw className="size-4" />
                  Practicar otra vez
                </Button>
              )}
            </div>
          </section>
        )}

        {(stage === "saving" || stage === "completed") && summary && (
          <ResultCard
            summary={summary}
            stats={resultStats(summary)}
            saving={stage === "saving"}
            saveStatus={saveStatus}
            onRestart={restart}
          />
        )}
      </div>

      {immersive && (
        <div
          data-testid="activity-stage"
          data-stage={stage}
          className="fixed inset-0 z-50 flex h-dvh flex-col overscroll-none bg-background select-none [touch-action:manipulation] [-webkit-touch-callout:none]"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">
                {stage === "practice" ? "Ronda de práctica" : "Reto"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {!confirmExit && (
                <Button
                  variant="ghost"
                  className="size-12"
                  aria-label={muted ? "Activar sonido" : "Silenciar"}
                  aria-pressed={!muted}
                  data-testid="sound-toggle"
                  onClick={toggleSound}
                >
                  {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
                </Button>
              )}
              {confirmExit ? (
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {stage === "practice" ? "¿Salir de la práctica?" : "Tu ronda quedará incompleta."}
                  </span>
                  <Button variant="outline" className="h-12" onClick={() => setConfirmExit(false)}>
                    Seguir
                  </Button>
                  <Button variant="destructive" className="h-12" onClick={exitImmersive}>
                    Salir
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="size-12"
                  aria-label="Salir del desafío"
                  onClick={() => setConfirmExit(true)}
                >
                  <X className="size-5" />
                </Button>
              )}
            </div>
          </header>

          <main className="relative min-h-0 flex-1">
            {stage === "countdown" && (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <p className="text-muted-foreground">Prepárate…</p>
                <p key={countdown} className="animate-pop font-heading text-7xl font-bold text-primary">
                  {countdown}
                </p>
              </div>
            )}
            {stage === "practice" && (
              <Round key={roundKey} mode="practice" origin={origin} onComplete={handlePracticeComplete} />
            )}
            {stage === "running" && (
              <Round key={roundKey} mode="registered" origin={origin} onComplete={handleRegisteredComplete} />
            )}
            {landscapeBlocked && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
                <Smartphone className="size-10 text-primary" />
                <p className="font-heading text-lg font-semibold">Gira tu teléfono</p>
                <p className="text-muted-foreground">Este reto se juega en vertical.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  summary,
  stats,
  saving,
  saveStatus,
  onRestart,
}: {
  summary: ActivitySummary;
  stats: { label: string; value: string }[];
  saving: boolean;
  saveStatus: SaveStatus | null;
  onRestart: () => void;
}) {
  const { primary } = summary;
  return (
    <section data-testid="activity-result" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
        <Sparkles className="size-5" />
      </span>
      <h2 className="mt-3 font-heading text-xl font-semibold">Tu resultado</h2>
      <p className="mt-4 text-sm text-muted-foreground">{primary.label}</p>
      <p className="font-heading text-4xl font-bold tracking-tight">
        {primary.value === null ? "—" : primary.value}
        {primary.value !== null && primary.unit && (
          <span className="ml-1 text-lg font-semibold text-muted-foreground">{primary.unit}</span>
        )}
      </p>
      <p className="mt-3 text-[15px]">{summary.styleNote}</p>
      <dl className="mt-5 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-muted/40 p-3">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="font-heading text-lg font-semibold">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p
        className={cn(
          "mt-4 flex items-center gap-2 text-sm text-muted-foreground",
          saveStatus === "queued" && "text-pulse",
        )}
      >
        {saving && "Guardando tu resultado…"}
        {saveStatus === "saved" && "Tu resultado quedó guardado en esta sesión."}
        {saveStatus === "queued" && (
          <>
            <CloudOff className="size-4 shrink-0" />
            Sin conexión: lo guardaremos en cuanto vuelvas a los desafíos.
          </>
        )}
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <Button
          size="lg"
          className="h-12 w-full text-base"
          render={<Link href="/actividades">Volver a los desafíos</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          className="h-12 w-full gap-2 text-base"
          onClick={onRestart}
          disabled={saving}
        >
          <RotateCcw className="size-4" />
          Repetir el reto
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Para tu informe se usa tu primer intento de cada desafío en esta sesión.
        </p>
      </div>
    </section>
  );
}

// Celular en horizontal en una actividad que necesita vertical.
function useLandscapeBlock(enabled: boolean) {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const query = window.matchMedia("(orientation: landscape) and (pointer: coarse) and (max-height: 500px)");
    const update = () => setBlocked(query.matches);
    update();
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
      setBlocked(false);
    };
  }, [enabled]);
  return enabled && blocked;
}
