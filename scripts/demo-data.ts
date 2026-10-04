/**
 * Datos de demostración para armar los tableros de Power BI antes del
 * taller. NO usar con participantes reales en la base.
 *
 *   npx tsx scripts/demo-data.ts seed [cantidad=20]
 *   npx tsx scripts/demo-data.ts purge
 *
 * Crea participantes ficticios (correo @demo.focuslab.test) con una sesión
 * completa: los seis desafíos v2 (corrida + ensayos + resumen), eventos
 * pasivos, pulsos de sesión y algo de Pomodoro/Kanban. Los ensayos salen de
 * rasgos latentes por participante (distracción, rapidez, memoria) para que
 * las relaciones de H1 tengan forma; las métricas se calculan con las MISMAS
 * funciones puras de la app (lib/activities/<actividad>/metrics.ts).
 *
 * `purge` (o supabase/scripts/reset_pre_taller.sql) borra todo: al eliminar
 * el usuario, ON DELETE CASCADE limpia sus filas.
 */
import { createClient } from "@supabase/supabase-js";

import {
  DEEP_READ_CONFIG,
  FOCUS_FLOW_CONFIG,
  MEMORY_MATRIX_CONFIG,
  PATTERN_HUNT_CONFIG,
  PROTOCOL_VERSION,
  REACTION_TEST_CONFIG,
  WORD_SPRINT_CONFIG,
} from "@/lib/activities/config";
import { countWords, DEEP_READ_PASSAGE } from "@/lib/activities/deep-read/content";
import { summarizeDeepRead } from "@/lib/activities/deep-read/metrics";
import { countInputs } from "@/lib/activities/device-context";
import { summarizeFocusFlow } from "@/lib/activities/focus-flow/metrics";
import { classifyFocusFlow, planFocusFlowTrials } from "@/lib/activities/focus-flow/trials";
import { summarizeMemoryMatrix } from "@/lib/activities/memory-matrix/metrics";
import {
  generateCorsiSequence,
  nextCorsiState,
  type CorsiState,
} from "@/lib/activities/memory-matrix/trials";
import { summarizePatternHunt } from "@/lib/activities/pattern-hunt/metrics";
import { planPatternHuntTrials } from "@/lib/activities/pattern-hunt/trials";
import { summarizeReactionTest } from "@/lib/activities/reaction-test/metrics";
import { classifyReaction, planReactionTrials } from "@/lib/activities/reaction-test/trials";
import { seededRng, type Rng } from "@/lib/activities/rng";
import type { ActivitySummary, DeviceContext, InputType, TrialRecord } from "@/lib/activities/types";
import { summarizeWordSprint } from "@/lib/activities/word-sprint/metrics";
import { planWordSprintTrials, STROOP_COLORS } from "@/lib/activities/word-sprint/trials";
import type { ActivityType, Database } from "@/lib/types/database";

process.loadEnvFile(".env.local");

const DEMO_DOMAIN = "demo.focuslab.test";
const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } },
);

// ------------------------------------------------------------ utilidades
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

function normal(rng: Rng, mean = 0, sd = 1) {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const chance = (rng: Rng, p: number) => rng() < p;

type Traits = {
  // Tendencia a distraerse (z): más cambios de pestaña, lapsos, comisiones.
  distraction: number;
  // Rapidez (z): TR más bajos, algo más de impulsividad en SART.
  speed: number;
  // Memoria de trabajo (z): span y comprensión.
  memory: number;
  mobile: boolean;
};

type Ctx = { rng: Rng; traits: Traits; input: (kind: "fast" | "pointer") => InputType };

function trialBase(i: number): Omit<TrialRecord, "condition"> {
  return {
    trialIndex: i,
    stimulusOnsetMs: null,
    responseAtMs: null,
    rtMs: null,
    response: null,
    detail: null,
    correct: null,
    classification: null,
    inputType: null,
    valid: true,
    invalidReason: null,
  };
}

// --------------------------------------------------------- generadores
function reactionTest({ rng, traits, input }: Ctx): TrialRecord[] {
  const plan = planReactionTrials(REACTION_TEST_CONFIG, "registered", rng);
  const offset = traits.mobile ? 55 : 0;
  let t = 0;
  return plan.map(({ isiMs }, i) => {
    t += isiMs;
    const base = trialBase(i);
    const anticipate = chance(rng, sigmoid(-3.3 + 0.5 * traits.distraction + 0.3 * traits.speed));
    if (anticipate && chance(rng, 0.5)) {
      const at = t - 200 - rng() * 800;
      t += 600;
      return { ...base, condition: { isiMs }, responseAtMs: round2(at), response: "early", correct: false, classification: "anticipation", inputType: input("fast") };
    }
    const lapse = chance(rng, sigmoid(-2.6 + 0.9 * traits.distraction));
    const timeout = lapse && chance(rng, 0.12);
    const rt = anticipate
      ? 60 + rng() * 35
      : lapse
        ? 520 + Math.abs(normal(rng, 0, 380))
        : clamp(normal(rng, 285 - 25 * traits.speed + 12 * traits.distraction + offset, 38), 140, 500);
    const onset = t;
    t += (timeout ? REACTION_TEST_CONFIG.responseWindowMs : rt) + REACTION_TEST_CONFIG.interTrialMs;
    if (timeout) {
      return { ...base, condition: { isiMs }, stimulusOnsetMs: round2(onset), correct: false, classification: "lapse" };
    }
    const classification = classifyReaction(rt, REACTION_TEST_CONFIG);
    return {
      ...base,
      condition: { isiMs },
      stimulusOnsetMs: round2(onset),
      responseAtMs: round2(onset + rt),
      rtMs: round2(rt),
      response: "press",
      correct: classification === "valid",
      classification,
      inputType: input("fast"),
    };
  });
}

function focusFlow({ rng, traits, input }: Ctx): TrialRecord[] {
  const plan = planFocusFlowTrials(FOCUS_FLOW_CONFIG, "registered", rng);
  const soa = FOCUS_FLOW_CONFIG.digitVisibleMs + FOCUS_FLOW_CONFIG.maskMs;
  const offset = traits.mobile ? 50 : 0;
  return plan.map((trial, i) => {
    const responded = trial.isTarget
      ? chance(rng, sigmoid(-0.4 + 0.9 * traits.distraction + 0.45 * traits.speed))
      : !chance(rng, sigmoid(-3.6 + 0.7 * traits.distraction - 0.2 * traits.speed));
    const rt = responded
      ? clamp(normal(rng, (trial.isTarget ? 320 : 385) - 30 * traits.speed + offset, 65), 150, soa - 20)
      : null;
    const onset = i * soa;
    const classification = classifyFocusFlow(trial.isTarget, responded);
    return {
      ...trialBase(i),
      condition: { digit: trial.digit, isTarget: trial.isTarget, fontSizeRem: trial.fontSizeRem },
      stimulusOnsetMs: onset,
      responseAtMs: rt === null ? null : round2(onset + rt),
      rtMs: rt === null ? null : round2(rt),
      response: responded ? "press" : null,
      correct: classification === "hit" || classification === "correct_withhold",
      classification,
      inputType: responded ? input("fast") : null,
    };
  });
}

function memoryMatrix({ rng, traits, input }: Ctx): TrialRecord[] {
  const capacity = clamp(Math.round(5.3 + 1.1 * traits.memory + normal(rng, 0, 0.5)), 3, 8);
  const trials: TrialRecord[] = [];
  let state: CorsiState | null = { length: MEMORY_MATRIX_CONFIG.startLength, attempt: 1 };
  let t = 0;
  while (state) {
    const { length, attempt } = state;
    const sequence = generateCorsiSequence(length, MEMORY_MATRIX_CONFIG.blockCount, rng);
    const p = length <= capacity ? 0.92 : length === capacity + 1 ? 0.3 : 0.06;
    const correct = chance(rng, p);
    let taps = [...sequence];
    let classification: string = "correct";
    if (!correct) {
      if (chance(rng, 0.5) && length >= 2) {
        const k = Math.floor(rng() * (length - 1));
        [taps[k], taps[k + 1]] = [taps[k + 1], taps[k]];
        classification = "order_error";
      } else {
        const unused = Array.from({ length: 9 }, (_, b) => b).filter((b) => !sequence.includes(b));
        taps[Math.floor(rng() * length)] = unused[Math.floor(rng() * unused.length)] ?? 0;
        classification = "item_error";
      }
      taps = taps.slice(0, length);
    }
    const firstTap = clamp(normal(rng, 900 - 60 * traits.speed, 180), 350, 2500);
    const perBlock = clamp(normal(rng, 560 - 40 * traits.speed, 90), 250, 1400);
    const tapTimes = taps.map((_, k) => round2(firstTap + k * perBlock));
    t += MEMORY_MATRIX_CONFIG.preSequenceMs + length * (MEMORY_MATRIX_CONFIG.blockOnMs + MEMORY_MATRIX_CONFIG.blockGapMs);
    const total = tapTimes[tapTimes.length - 1];
    trials.push({
      ...trialBase(trials.length),
      condition: { length, attempt, sequence },
      stimulusOnsetMs: round2(t),
      responseAtMs: round2(t + total),
      rtMs: total,
      response: taps.join("-"),
      detail: { firstTapMs: round2(firstTap), taps: taps.map((block, k) => ({ block, atMs: tapTimes[k] })) },
      correct: classification === "correct",
      classification,
      inputType: input("pointer"),
    });
    t += total + MEMORY_MATRIX_CONFIG.feedbackMs;
    state = nextCorsiState(state, classification === "correct", MEMORY_MATRIX_CONFIG);
  }
  return trials;
}

function wordSprint({ rng, traits, input }: Ctx): TrialRecord[] {
  const plan = planWordSprintTrials(WORD_SPRINT_CONFIG, "registered", rng);
  const offset = traits.mobile ? 60 : 0;
  const interference = 85 + 25 * traits.distraction + normal(rng, 0, 20);
  let t = 0;
  return plan.map((trial, i) => {
    t += WORD_SPRINT_CONFIG.fixationMs;
    const errP = trial.congruent ? 0.02 : sigmoid(-2.9 + 0.6 * traits.distraction + 0.3 * traits.speed);
    const timeout = chance(rng, 0.01);
    const rt = clamp(
      normal(rng, 680 - 50 * traits.speed + offset + (trial.congruent ? 0 : interference), 95),
      330,
      WORD_SPRINT_CONFIG.responseWindowMs - 10,
    );
    const onset = t;
    t += (timeout ? WORD_SPRINT_CONFIG.responseWindowMs : rt) + WORD_SPRINT_CONFIG.interTrialMs;
    const base = { ...trialBase(i), condition: { word: trial.word, ink: trial.ink, congruent: trial.congruent }, stimulusOnsetMs: round2(onset) };
    if (timeout) return { ...base, correct: false, classification: "timeout" };
    const error = chance(rng, errP);
    const wrongOptions = STROOP_COLORS.map((c) => c.id).filter((id) => id !== trial.ink);
    // Un error incongruente suele ser leer la palabra en vez del color.
    const response = error
      ? !trial.congruent && chance(rng, 0.75)
        ? trial.word
        : wrongOptions[Math.floor(rng() * wrongOptions.length)]
      : trial.ink;
    return {
      ...base,
      responseAtMs: round2(onset + rt),
      rtMs: round2(rt),
      response,
      correct: !error,
      classification: error ? "error" : "correct",
      inputType: input("fast"),
    };
  });
}

function patternHunt({ rng, traits, input }: Ctx): TrialRecord[] {
  const plan = planPatternHuntTrials(PATTERN_HUNT_CONFIG, "registered", rng);
  const offset = traits.mobile ? 60 : 0;
  const conjSlope = clamp(normal(rng, 26 - 5 * traits.speed + 3 * traits.distraction, 6), 8, 50);
  let t = 0;
  return plan.map((trial, i) => {
    t += PATTERN_HUNT_CONFIG.fixationMs;
    const slope = trial.type === "feature" ? 2 + rng() * 3 : conjSlope;
    const searchCost = slope * trial.setSize * (trial.present ? 1 : 1.9);
    const rt = clamp(normal(rng, 560 - 40 * traits.speed + offset + searchCost, 110), 300, PATTERN_HUNT_CONFIG.responseWindowMs - 10);
    const errP = trial.present
      ? (trial.type === "conjunction" ? 0.04 + trial.setSize * 0.004 : 0.015) + 0.02 * Math.max(0, traits.speed)
      : 0.025;
    const error = chance(rng, errP);
    const answer = trial.present !== error ? "present" : "absent";
    const classification = trial.present
      ? answer === "present" ? "hit" : "miss"
      : answer === "absent" ? "correct_rejection" : "false_alarm";
    const onset = t;
    t += rt + PATTERN_HUNT_CONFIG.interTrialMs;
    return {
      ...trialBase(i),
      condition: { type: trial.type, setSize: trial.setSize, present: trial.present },
      stimulusOnsetMs: round2(onset),
      responseAtMs: round2(onset + rt),
      rtMs: round2(rt),
      response: answer,
      correct: classification === "hit" || classification === "correct_rejection",
      classification,
      inputType: input("fast"),
    };
  });
}

function deepRead({ rng, traits, input }: Ctx): TrialRecord[] {
  const words = countWords(DEEP_READ_PASSAGE);
  const wpm = clamp(normal(rng, 215 + 25 * traits.speed - 20 * traits.distraction, 30), 110, 360);
  const readingMs = (words / wpm) * 60_000;
  const notifications = DEEP_READ_CONFIG.notificationAtMs
    .filter((at) => at < readingMs)
    .map((at, k) => {
      const opened = chance(rng, sigmoid(-1.6 + 1.0 * traits.distraction));
      const closed = !opened && chance(rng, 0.55);
      const outcome = opened ? "opened" : closed ? "closed" : "ignored";
      return {
        id: `n${k + 1}`,
        shownAtMs: at,
        outcome,
        reactionMs: outcome === "ignored" ? null : Math.round(clamp(normal(rng, 1800, 600), 500, 5500)),
      };
    });
  const visibilityExits = traits.distraction > 1 ? (chance(rng, 0.6) ? 1 : 2) : chance(rng, 0.08) ? 1 : 0;
  const trials: TrialRecord[] = [
    {
      ...trialBase(0),
      condition: { kind: "reading", passageId: DEEP_READ_PASSAGE.id, words },
      stimulusOnsetMs: 0,
      responseAtMs: round2(readingMs),
      rtMs: round2(readingMs),
      response: "done",
      detail: { visibilityExits, notifications },
      classification: "reading",
      inputType: input("pointer"),
    },
  ];
  let t = readingMs;
  DEEP_READ_PASSAGE.questions.forEach((q, k) => {
    const p = sigmoid((q.type === "literal" ? 1.1 : 0.4) + 0.6 * traits.memory - 0.35 * traits.distraction - 0.25 * visibilityExits);
    const correct = chance(rng, p);
    const wrong = q.options.filter((o) => o.id !== q.correctId);
    const rt = clamp(normal(rng, 9000 - 900 * traits.speed, 2500), 2500, 30_000);
    trials.push({
      ...trialBase(k + 1),
      condition: { kind: "question", questionId: q.id, type: q.type, optionOrder: q.options.map((o) => o.id) },
      stimulusOnsetMs: round2(t),
      responseAtMs: round2(t + rt),
      rtMs: round2(rt),
      response: correct ? q.correctId : wrong[Math.floor(rng() * wrong.length)].id,
      detail: { answerChanges: chance(rng, 0.25) ? 1 : 0, firstChoiceMs: Math.round(rt * 0.6) },
      correct,
      classification: correct ? "correct" : "incorrect",
      inputType: input("pointer"),
    });
    t += rt;
  });
  return trials;
}

const ACTIVITIES: {
  type: ActivityType;
  config: object;
  generate: (ctx: Ctx) => TrialRecord[];
  summarize: (trials: TrialRecord[]) => ActivitySummary;
}[] = [
  { type: "reaction_test", config: REACTION_TEST_CONFIG, generate: reactionTest, summarize: summarizeReactionTest },
  { type: "focus_flow", config: FOCUS_FLOW_CONFIG, generate: focusFlow, summarize: summarizeFocusFlow },
  { type: "memory_matrix", config: MEMORY_MATRIX_CONFIG, generate: memoryMatrix, summarize: summarizeMemoryMatrix },
  { type: "word_sprint", config: WORD_SPRINT_CONFIG, generate: wordSprint, summarize: summarizeWordSprint },
  { type: "pattern_hunt", config: PATTERN_HUNT_CONFIG, generate: patternHunt, summarize: summarizePatternHunt },
  { type: "deep_read", config: DEEP_READ_CONFIG, generate: deepRead, summarize: summarizeDeepRead },
];

function deviceFor(rng: Rng, mobile: boolean): DeviceContext {
  if (mobile) {
    const ios = chance(rng, 0.45);
    return {
      deviceType: "mobile",
      viewportW: ios ? 390 : 412,
      viewportH: ios ? 664 : 780,
      devicePixelRatio: ios ? 3 : 2.63,
      orientation: "portrait",
      browser: ios ? "Safari 17" : "Google Chrome 129",
      os: ios ? "iOS" : "Android",
      refreshHzEst: chance(rng, 0.25) ? 120 : 60,
    };
  }
  const big = chance(rng, 0.4);
  return {
    deviceType: "desktop",
    viewportW: big ? 1920 : 1366,
    viewportH: big ? 969 : 657,
    devicePixelRatio: 1,
    orientation: "landscape",
    browser: chance(rng, 0.8) ? "Google Chrome 129" : "Microsoft Edge 129",
    os: "Windows",
    refreshHzEst: chance(rng, 0.15) ? 144 : 60,
  };
}

// --------------------------------------------------------------- seed
async function seed(count: number) {
  // Taller simulado: sábado 3 de octubre de 2026, 9:00 hora de Guatemala.
  const workshopStart = Date.parse("2026-10-03T15:00:00Z");
  for (let n = 1; n <= count; n++) {
    const rng = seededRng(20261003 + n);
    const traits: Traits = {
      distraction: normal(rng),
      speed: normal(rng),
      memory: normal(rng),
      mobile: chance(rng, 0.6),
    };
    const code = String(n).padStart(2, "0");
    const { data: created, error } = await admin.auth.admin.createUser({
      email: `demo-${code}@${DEMO_DOMAIN}`,
      password: `Demo-${crypto.randomUUID()}`,
      email_confirm: true,
      user_metadata: { full_name: `Participante demo ${code}` },
    });
    if (error || !created.user) throw error ?? new Error("No se creó el usuario demo");
    const userId = created.user.id;
    const device = deviceFor(rng, traits.mobile);
    const input = (kind: "fast" | "pointer"): InputType =>
      traits.mobile ? "touch" : kind === "fast" && chance(rng, 0.85) ? "keyboard" : "mouse";

    const sessionStart = workshopStart + Math.round(rng() * 40) * 60_000;
    const iso = (ms: number) => new Date(ms).toISOString();
    await must(admin.from("consents").insert({ user_id: userId, accepted_at: iso(sessionStart - 120_000) }));

    let clock = sessionStart + 90_000;
    const events: Database["public"]["Tables"]["interaction_events"]["Insert"][] = [];
    const runs: { type: ActivityType; start: number; end: number }[] = [];
    const sessionId = crypto.randomUUID();
    await must(admin.from("sessions").insert({ id: sessionId, user_id: userId, status: "en_progreso", started_at: iso(sessionStart) }));

    for (const [k, activity] of ACTIVITIES.entries()) {
      const trials = activity.generate({ rng, traits, input });
      const summary = activity.summarize(trials);
      const lastAt = Math.max(...trials.map((t) => t.responseAtMs ?? t.stimulusOnsetMs ?? 0));
      const practiceMs = 25_000 + rng() * 20_000;
      const start = clock + practiceMs;
      const durationMs = lastAt + 1500;
      const end = start + durationMs;
      const runId = crypto.randomUUID();
      const { counts, primary } = countInputs(trials);
      await must(
        admin.from("activity_runs").insert({
          id: runId,
          session_id: sessionId,
          user_id: userId,
          activity_type: activity.type,
          protocol_version: PROTOCOL_VERSION,
          status: "completada",
          started_at: iso(start),
          ended_at: iso(end),
          practice_rounds: chance(rng, 0.2) ? 2 : 1,
          config: { ...activity.config, demo: true },
          device_type: device.deviceType,
          input_primary: primary,
          input_counts: counts,
          viewport_w: device.viewportW,
          viewport_h: device.viewportH,
          device_pixel_ratio: device.devicePixelRatio,
          orientation: device.orientation,
          browser: device.browser,
          os: device.os,
          refresh_hz_est: device.refreshHzEst,
          visibility_losses: activity.type === "deep_read" ? Number(summary.metrics.visibilityExits ?? 0) : 0,
        }),
      );
      await must(
        admin.from("activity_trials").insert(
          trials.map((t) => ({
            run_id: runId,
            user_id: userId,
            trial_index: t.trialIndex,
            condition: t.condition,
            stimulus_onset_ms: t.stimulusOnsetMs,
            response_at_ms: t.responseAtMs,
            rt_ms: t.rtMs,
            response: t.response,
            response_detail: t.detail ?? null,
            correct: t.correct,
            classification: t.classification,
            input_type: t.inputType,
            valid: t.valid,
            invalid_reason: t.invalidReason,
          })),
        ),
      );
      await must(
        admin.from("activity_results").insert({
          run_id: runId,
          session_id: sessionId,
          user_id: userId,
          activity_type: activity.type,
          protocol_version: PROTOCOL_VERSION,
          duration_ms: Math.round(durationMs),
          accuracy: summary.accuracy,
          level_reached: summary.levelReached,
          metrics: { ...summary.metrics, report: summary.report, demo: true },
          completed_at: iso(end),
        }),
      );
      events.push(
        { session_id: sessionId, user_id: userId, event_type: "activity_start", payload: { activity_type: activity.type, run_id: runId }, occurred_at: iso(start) },
        { session_id: sessionId, user_id: userId, event_type: "activity_end", payload: { activity_type: activity.type, run_id: runId, status: "completada" }, occurred_at: iso(end) },
      );
      runs.push({ type: activity.type, start, end });
      clock = end + 20_000 + rng() * 40_000;
      // Pulso de sesión cada 3 actividades.
      if (k === 2 || k === 5) {
        const rating = clamp(Math.round(normal(rng, 3.6 - 0.6 * traits.distraction, 0.7)), 1, 5);
        events.push({ session_id: sessionId, user_id: userId, event_type: "session_pulse", payload: { rating, milestone: k === 2 ? 1 : 2 }, occurred_at: iso(clock) });
      }
    }

    // Herramientas: Pomodoro y Kanban, al final de la sesión.
    const pomodoros = Math.floor(rng() * 3);
    for (let p = 0; p < pomodoros; p++) {
      const start = clock + p * 6 * 60_000;
      const interrupted = chance(rng, sigmoid(-1.1 + 1.1 * traits.distraction));
      const pauses = interrupted ? 1 + Math.floor(rng() * 3) : chance(rng, 0.3) ? 1 : 0;
      await must(
        admin.from("pomodoro_sessions").insert({
          user_id: userId,
          session_id: sessionId,
          work_duration_minutes: 5,
          break_duration_minutes: 1,
          started_at: iso(start),
          completed_cycles: interrupted ? 0 : 1,
          interrupted,
          pause_count: pauses,
          paused_ms: pauses * Math.round(15_000 + rng() * 45_000),
        } as Database["public"]["Tables"]["pomodoro_sessions"]["Insert"]),
      );
      events.push({ session_id: sessionId, user_id: userId, event_type: "tool_start", payload: { tool: "pomodoro" }, occurred_at: iso(start) });
      if (interrupted) {
        events.push({ session_id: sessionId, user_id: userId, event_type: "tool_interrupt", payload: { tool: "pomodoro" }, occurred_at: iso(start + 120_000) });
      }
    }
    if (chance(rng, 0.6)) {
      const titles = ["Leer capítulo 3", "Entregar informe", "Repasar para el parcial", "Reunión de grupo"];
      const tasks = 1 + Math.floor(rng() * 3);
      await must(
        admin.from("kanban_tasks").insert(
          Array.from({ length: tasks }, (_, i) => ({
            user_id: userId,
            title: titles[i % titles.length],
            status: (["pendiente", "en_progreso", "completado"] as const)[Math.floor(rng() * 3)],
            position: i,
            created_at: iso(clock + i * 30_000),
          })) as Database["public"]["Tables"]["kanban_tasks"]["Insert"][],
        ),
      );
      events.push({ session_id: sessionId, user_id: userId, event_type: "tool_start", payload: { tool: "kanban" }, occurred_at: iso(clock) });
    }
    const sessionEnd = clock + (pomodoros + 1) * 6 * 60_000;

    // Eventos pasivos: cambios de pestaña, inactividad y clics.
    const span = sessionEnd - sessionStart;
    const at = () => sessionStart + 60_000 + rng() * (span - 120_000);
    const tabSwitches = Math.max(0, Math.round(normal(rng, 2 + 2.6 * traits.distraction, 1.2)));
    for (let k = 0; k < tabSwitches; k++) {
      const hiddenAt = at();
      events.push(
        { session_id: sessionId, user_id: userId, event_type: "visibility_change", payload: { state: "hidden" }, occurred_at: iso(hiddenAt) },
        { session_id: sessionId, user_id: userId, event_type: "visibility_change", payload: { state: "visible" }, occurred_at: iso(hiddenAt + 3000 + rng() * 40_000) },
      );
    }
    const idles = Math.max(0, Math.round(normal(rng, 1 + 1.1 * traits.distraction, 0.8)));
    for (let k = 0; k < idles; k++) {
      const idleAt = at();
      events.push(
        { session_id: sessionId, user_id: userId, event_type: "idle_start", payload: {}, occurred_at: iso(idleAt) },
        { session_id: sessionId, user_id: userId, event_type: "idle_end", payload: {}, occurred_at: iso(idleAt + 10_000 + Math.abs(normal(rng, 50_000, 40_000))) },
      );
    }
    const clicks = Math.round(clamp(normal(rng, 260 + 40 * traits.distraction, 60), 120, 480));
    for (let k = 0; k < clicks; k++) {
      events.push({ session_id: sessionId, user_id: userId, event_type: "click", payload: { tag: "BUTTON" }, occurred_at: iso(at()) });
    }
    for (let k = 0; k < events.length; k += 500) {
      await must(admin.from("interaction_events").insert(events.slice(k, k + 500)));
    }

    await must(admin.from("sessions").update({ status: "completada", ended_at: iso(sessionEnd) }).eq("id", sessionId));
    console.log(
      `demo-${code}: ${traits.mobile ? "celular" : "laptop"} · distracción ${traits.distraction.toFixed(2)} · ${runs.length} desafíos · ${events.length} eventos`,
    );
  }
}

async function must<T extends { error: { message: string } | null }>(promise: PromiseLike<T>): Promise<T> {
  const result = await promise;
  if (result.error) throw new Error(result.error.message);
  return result;
}

// -------------------------------------------------------------- purge
async function purge() {
  let removed = 0;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const demo = data.users.filter((u) => u.email?.endsWith(`@${DEMO_DOMAIN}`));
    for (const user of demo) {
      await admin.auth.admin.deleteUser(user.id);
      removed += 1;
    }
    if (data.users.length < 200) break;
  }
  console.log(`Participantes demo borrados: ${removed}`);
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  if (command === "seed") await seed(Number(arg ?? 20));
  else if (command === "purge") await purge();
  else console.log("Uso: npx tsx scripts/demo-data.ts seed [cantidad] | purge");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
