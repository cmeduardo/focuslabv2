import { timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { applyAiReportResult } from "@/lib/services/ai-reports";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AiReportStatus } from "@/lib/types/database";

const VALID_STATUSES: readonly AiReportStatus[] = ["completado", "fallido"];

function isAuthorized(request: NextRequest) {
  const expected = process.env.AI_REPORT_WEBHOOK_SECRET;
  const provided = request.headers.get("x-webhook-secret");

  if (!expected || !provided) {
    return false;
  }

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  return (
    expectedBuf.length === providedBuf.length &&
    timingSafeEqual(expectedBuf, providedBuf)
  );
}

type AiReportWebhookBody = {
  sessionId?: unknown;
  status?: unknown;
  attentionalProfile?: unknown;
  strengths?: unknown;
  areasForImprovement?: unknown;
  recommendations?: unknown;
  rawResponse?: unknown;
};

// Webhook de retorno del flujo de informe de IA (módulo 5, Sprint 4): n8n
// llama acá con el resultado de GPT-4o-mini tras generar el informe
// atencional de una sesión. Ver ARCHITECTURE.md §7.
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as AiReportWebhookBody | null;

  if (!body || typeof body.sessionId !== "string") {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const status: AiReportStatus = VALID_STATUSES.includes(
    body.status as AiReportStatus,
  )
    ? (body.status as AiReportStatus)
    : "completado";

  const supabase = createAdminClient();

  const updated = await applyAiReportResult(supabase, {
    sessionId: body.sessionId,
    status,
    attentionalProfile:
      typeof body.attentionalProfile === "string" ? body.attentionalProfile : null,
    strengths: Array.isArray(body.strengths) ? body.strengths : [],
    areasForImprovement: Array.isArray(body.areasForImprovement)
      ? body.areasForImprovement
      : [],
    recommendations: Array.isArray(body.recommendations) ? body.recommendations : [],
    rawResponse:
      body.rawResponse && typeof body.rawResponse === "object"
        ? (body.rawResponse as Record<string, unknown>)
        : null,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "No se encontró un informe pendiente para esa sesión." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
