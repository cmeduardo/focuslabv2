"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { StreakBadge } from "@/components/activities/streak-badge";
import type { ActivityOutcome } from "@/hooks/use-activity-result";
import { playCombo, playHit, playMiss } from "@/lib/audio/beep";
import { cn } from "@/lib/utils";

// Mecánica fusionada (2026-08-27): SART (Robertson et al., 1997) con
// incertidumbre espacial como columna vertebral — el estímulo aparece a
// cadencia VARIABLE (900–2000ms, rompe el ritmo predecible que tenía la
// versión de solo-cadencia-fija) en 1 de 9 celdas al azar — más la capa de
// tiempo de reacción y puntería de un PVT: el círculo-objetivo se achica
// con la racha y se mide la distancia del clic a su centro. Cualquier clic
// fuera de la celda activa (incluso sin ningún estímulo visible) cuenta
// como arranque en falso / respuesta impulsiva. Responder al frecuente
// (círculo), inhibir el infrecuente (cuadrado).
const TOTAL_DURATION_MS = 90_000;
const SOA_MIN_MS = 900;
const SOA_MAX_MS = 2000;
const VISIBLE_MS = 700;
const NOGO_CHANCE = 0.2;
const MAX_METER_STREAK = 15;
const GRID_SLOTS = 9;
const BASE_SIZE = 72;
const MIN_SIZE = 32;
const SIZE_STEP = 4;
// Cuenta regresiva antes del primer ensayo — evita que el primer tiempo
// de reacción quede contaminado por la sorpresa de arrancar sin aviso
// (pedido directo, 2026-08-28).
const COUNTDOWN_SECONDS = 3;

type StimulusKind = "go" | "noGo";

function sizeForStreak(streak: number) {
  return Math.max(MIN_SIZE, BASE_SIZE - streak * SIZE_STEP);
}

export function ReactionTestGame({
  onFinish,
}: {
  onFinish: (outcome: ActivityOutcome) => void;
}) {
  const [trialIndex, setTrialIndex] = useState(0);
  const [stimulus, setStimulus] = useState<StimulusKind | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [targetSize, setTargetSize] = useState(BASE_SIZE);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [fx, setFx] = useState<"pop" | "shake" | null>(null);
  const [fxKey, setFxKey] = useState(0);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const gameStartRef = useRef<number | null>(null);
  const hitsRef = useRef(0);
  const omissionsRef = useRef(0);
  const commissionsRef = useRef(0);
  const falseStartsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const commissionTimesRef = useRef<number[]>([]);
  const aimDistancesPxRef = useRef<number[]>([]);
  const targetSizesRef = useRef<number[]>([]);
  const trialOutcomesRef = useRef<("hit" | "omission" | "commission" | "inhibit")[]>([]);
  const trialLogRef = useRef<
    {
      trialIndex: number;
      kind: StimulusKind;
      slot: number;
      outcome: "hit" | "omission" | "commission" | "inhibit";
      rt: number | null;
    }[]
  >([]);
  const hitsBySlotRef = useRef<number[]>(new Array(GRID_SLOTS).fill(0));
  const omissionsBySlotRef = useRef<number[]>(new Array(GRID_SLOTS).fill(0));
  const stimulusAtRef = useRef<number | null>(null);
  const currentKindRef = useRef<StimulusKind | null>(null);
  const currentSlotRef = useRef<number | null>(null);
  const currentTrialIndexRef = useRef<number | null>(null);
  const currentTargetSizeRef = useRef(BASE_SIZE);
  const respondedRef = useRef(false);
  const streakRef = useRef(0);
  const scoreRef = useRef(0);
  const bestStreakRef = useRef(0);
  const finishedRef = useRef(false);

  function applyOutcome(kind: "hit" | "inhibit" | "miss", points = 0) {
    if (kind === "miss") {
      streakRef.current = 0;
    } else {
      streakRef.current += 1;
      scoreRef.current += points;
      bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      if (streakRef.current > 0 && streakRef.current % 5 === 0) {
        playCombo();
      }
    }
    setStreak(streakRef.current);
    setScore(scoreRef.current);
    if (kind !== "inhibit") {
      setFx(kind === "hit" ? "pop" : "shake");
      setFxKey((k) => k + 1);
    }
  }

  const finishGame = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const hits = hitsRef.current;
    const omissions = omissionsRef.current;
    const commissions = commissionsRef.current;
    const accuracy =
      hits + omissions ? Math.round((hits / (hits + omissions)) * 100) : 0;
    const rt = reactionTimesRef.current;
    const avgMs = rt.length
      ? Math.round(rt.reduce((a, b) => a + b, 0) / rt.length)
      : 0;
    const rtSD = rt.length
      ? Math.round(
          Math.sqrt(rt.reduce((sum, t) => sum + (t - avgMs) ** 2, 0) / rt.length),
        )
      : 0;
    const rtCV = avgMs ? Math.round((rtSD / avgMs) * 100) : 0;
    const half = Math.floor(rt.length / 2);
    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const earlyAvgMs = avg(rt.slice(0, half));
    const lateAvgMs = avg(rt.slice(half));
    // Decaimiento de vigilancia: tasa de omisión en cada tercio de la
    // prueba — la señal clásica de que la atención sostenida decae con el
    // tiempo (o no).
    const outcomes = trialOutcomesRef.current;
    const thirdSize = Math.ceil(outcomes.length / 3) || 1;
    const omissionRateFor = (slice: typeof outcomes) => {
      const goTrials = slice.filter((o) => o === "hit" || o === "omission");
      return goTrials.length
        ? Math.round(
            (slice.filter((o) => o === "omission").length / goTrials.length) * 100,
          )
        : 0;
    };
    const omissionsByThird = [
      omissionRateFor(outcomes.slice(0, thirdSize)),
      omissionRateFor(outcomes.slice(thirdSize, thirdSize * 2)),
      omissionRateFor(outcomes.slice(thirdSize * 2)),
    ];
    onFinish({
      accuracy,
      levelReached: null,
      metrics: {
        hits,
        omissions,
        commissions,
        falseStarts: falseStartsRef.current,
        reactionTimesMs: rt,
        avgReactionMs: avgMs,
        reactionRtSD: rtSD,
        rtCV,
        earlyAvgMs,
        lateAvgMs,
        commissionTimesMs: commissionTimesRef.current,
        aimDistancesPx: aimDistancesPxRef.current,
        targetSizesPx: targetSizesRef.current,
        omissionsByThirdPct: omissionsByThird,
        trialLog: trialLogRef.current,
        hitsBySlot: hitsBySlotRef.current,
        omissionsBySlot: omissionsBySlotRef.current,
        score: scoreRef.current,
        bestStreak: bestStreakRef.current,
      },
    });
  }, [onFinish]);

  // Cuenta regresiva antes de arrancar — el efecto de ensayos de abajo
  // espera a que llegue a 0.
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Cada ensayo decide go/no-go, una celda al azar y una cadencia (SOA)
  // aleatoria hasta el próximo ensayo — el setState real ocurre dentro de
  // los setTimeout, nunca de forma síncrona en el efecto.
  useEffect(() => {
    if (finishedRef.current || countdown > 0) return;
    if (gameStartRef.current === null) gameStartRef.current = performance.now();
    if (performance.now() - gameStartRef.current >= TOTAL_DURATION_MS) {
      const endTimer = setTimeout(finishGame, 0);
      return () => clearTimeout(endTimer);
    }

    const kind: StimulusKind = Math.random() < NOGO_CHANCE ? "noGo" : "go";
    const slot = Math.floor(Math.random() * GRID_SLOTS);
    const soa = SOA_MIN_MS + Math.random() * (SOA_MAX_MS - SOA_MIN_MS);
    // El primer ensayo no tiene el "colchón" natural que le da a los demás
    // el SOA del ensayo anterior — sin este preDelay, el estímulo aparecía
    // igual de tarde pero se ocultaba en el mismo VISIBLE_MS de siempre,
    // dejándolo visible una fracción del tiempo real (bug encontrado
    // 2026-08-28: se agregó demora solo al show, no al hide). Con
    // preDelay, show/hide/next se corren todos juntos — la ventana visible
    // sigue siendo VISIBLE_MS completos.
    const preDelay = trialIndex === 0 ? SOA_MIN_MS : 0;

    const showTimer = setTimeout(() => {
      const size = sizeForStreak(streakRef.current);
      currentKindRef.current = kind;
      currentSlotRef.current = slot;
      currentTrialIndexRef.current = trialIndex;
      currentTargetSizeRef.current = size;
      respondedRef.current = false;
      stimulusAtRef.current = performance.now();
      if (kind === "go") {
        targetSizesRef.current.push(size);
      }
      setStimulus(kind);
      setActiveSlot(slot);
      setTargetSize(size);
    }, preDelay);

    const hideTimer = setTimeout(() => {
      setStimulus(null);
      setActiveSlot(null);
      if (!respondedRef.current) {
        if (kind === "go") {
          omissionsRef.current += 1;
          omissionsBySlotRef.current[slot] += 1;
          trialOutcomesRef.current.push("omission");
          trialLogRef.current.push({ trialIndex, kind, slot, outcome: "omission", rt: null });
          applyOutcome("miss");
        } else {
          trialOutcomesRef.current.push("inhibit");
          trialLogRef.current.push({ trialIndex, kind, slot, outcome: "inhibit", rt: null });
          applyOutcome("inhibit", 25);
        }
      }
      currentKindRef.current = null;
      currentSlotRef.current = null;
    }, preDelay + VISIBLE_MS);

    const nextTimer = setTimeout(() => {
      setTrialIndex((i) => i + 1);
    }, preDelay + soa);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(nextTimer);
    };
  }, [trialIndex, finishGame, countdown]);

  const handleSlotClick = useCallback(
    (slot: number, event: React.MouseEvent<HTMLButtonElement>) => {
      if (finishedRef.current) return;
      const isActiveSlot =
        currentKindRef.current !== null && currentSlotRef.current === slot;

      if (!isActiveSlot) {
        falseStartsRef.current += 1;
        playMiss();
        applyOutcome("miss");
        return;
      }
      if (respondedRef.current) return;
      respondedRef.current = true;

      let rt = 0;
      if (stimulusAtRef.current !== null) {
        rt = Math.round(performance.now() - stimulusAtRef.current);
      }

      const trialIndex = currentTrialIndexRef.current ?? -1;

      if (currentKindRef.current === "go") {
        const rect = event.currentTarget.getBoundingClientRect();
        const distance = Math.round(
          Math.hypot(
            event.clientX - (rect.left + rect.width / 2),
            event.clientY - (rect.top + rect.height / 2),
          ),
        );
        aimDistancesPxRef.current.push(distance);
        hitsRef.current += 1;
        hitsBySlotRef.current[slot] += 1;
        reactionTimesRef.current.push(rt);
        trialOutcomesRef.current.push("hit");
        trialLogRef.current.push({ trialIndex, kind: "go", slot, outcome: "hit", rt });
        playHit();
        applyOutcome("hit", Math.max(20, 320 - rt));
      } else {
        commissionsRef.current += 1;
        commissionTimesRef.current.push(rt);
        trialOutcomesRef.current.push("commission");
        trialLogRef.current.push({ trialIndex, kind: "noGo", slot, outcome: "commission", rt });
        playMiss();
        applyOutcome("miss");
      }
    },
    [],
  );

  const meterPct = Math.min(100, (streak / MAX_METER_STREAK) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Hacé clic apenas veas un <span className="text-primary">círculo violeta</span>. Si es un <span className="text-pulse">cuadrado coral</span>, no hagas nada.
        </span>
        <span className="flex items-center gap-2 font-heading font-semibold text-foreground">
          {score}
          <StreakBadge streak={streak} />
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${meterPct}%` }}
        />
      </div>
      <div className="relative mx-auto w-fit">
        {countdown > 0 && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 rounded-2xl bg-background/95">
            <p className="text-sm text-muted-foreground">Preparate…</p>
            <p
              key={countdown}
              className="animate-pop font-heading text-6xl font-bold text-primary"
            >
              {countdown}
            </p>
          </div>
        )}
        <div
          key={fxKey}
          className={cn(
            "grid w-fit grid-cols-3 gap-3 rounded-2xl border border-dashed border-border bg-muted/20 p-4",
            fx === "shake" && "animate-shake",
          )}
        >
          {Array.from({ length: GRID_SLOTS }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => handleSlotClick(i, e)}
              disabled={countdown > 0}
              className="flex size-24 items-center justify-center rounded-xl border border-border bg-background/60"
            >
              {activeSlot === i && stimulus === "go" && (
                <span
                  style={{ width: targetSize, height: targetSize }}
                  className={cn("rounded-full bg-primary", fx === "pop" && "animate-pop")}
                />
              )}
              {activeSlot === i && stimulus === "noGo" && (
                <span className="size-14 rounded-lg bg-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
