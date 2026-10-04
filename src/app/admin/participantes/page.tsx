import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { AiReportStatus } from "@/lib/types/database";

import { RetryReportButton } from "./retry-report-button";

// Un informe 'pendiente' normalmente tarda segundos: pasado este margen se
// considera atascado (webhook caído, workflow inactivo) y se ofrece reintento.
const STUCK_AFTER_MS = 5 * 60 * 1000;

const STATUS_LABEL: Record<AiReportStatus, string> = {
  pendiente: "Generando…",
  completado: "Completado",
  fallido: "Falló",
};

function isStuck(report: { status: AiReportStatus; requested_at: string }) {
  return (
    report.status === "fallido" ||
    (report.status === "pendiente" &&
      Date.now() - new Date(report.requested_at).getTime() > STUCK_AFTER_MS)
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    // Render de servidor (UTC en Vercel): fijar la zona del taller.
    timeZone: "America/Guatemala",
  });
}

export default async function ParticipantesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  // RS-04: el listado de participantes incluye datos identificables, por lo
  // que queda restringido al investigador (nunca a autoridades académicas).
  if (profile?.role !== "investigador") {
    redirect("/admin");
  }

  const [profiles, consents, sessions, reports] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role", "participante")
      .order("created_at"),
    supabase.from("consents").select("user_id, accepted_at"),
    supabase.from("sessions").select("id, user_id, status, started_at"),
    supabase
      .from("ai_reports")
      .select("session_id, user_id, status, requested_at")
      .order("requested_at", { ascending: false }),
  ]);

  if (profiles.error || consents.error || sessions.error || reports.error) {
    throw new Error("No se pudo cargar el listado de participantes.");
  }

  const consented = new Set((consents.data ?? []).map((row) => row.user_id));

  const participants = (profiles.data ?? []).map((participant, index) => {
    const userSessions = (sessions.data ?? []).filter(
      (row) => row.user_id === participant.id,
    );
    const lastReport = (reports.data ?? []).find(
      (row) => row.user_id === participant.id,
    );
    const stuck = lastReport !== undefined && isStuck(lastReport);

    return {
      id: participant.id,
      label: participant.full_name?.trim() || `Participante ${index + 1}`,
      hasConsent: consented.has(participant.id),
      totalSessions: userSessions.length,
      completedSessions: userSessions.filter((row) => row.status === "completada")
        .length,
      lastReport,
      stuck,
    };
  });

  const withConsent = participants.filter((p) => p.hasConsent).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Participantes
        </h1>
        <p className="text-muted-foreground">
          Gestión del taller piloto: consentimiento, avance e informes de IA.
          Visible solo para el investigador (RS-04).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Participantes", value: participants.length },
          { label: "Con consentimiento", value: withConsent },
          {
            label: "Informes por revisar",
            value: participants.filter((p) => p.stuck).length,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-heading text-2xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          {participants.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay participantes registrados.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Participante</th>
                  <th className="py-2 pr-4 font-medium">Consentimiento</th>
                  <th className="py-2 pr-4 font-medium">Sesiones</th>
                  <th className="py-2 pr-4 font-medium">Último informe</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 pr-4 font-medium">{p.label}</td>
                    <td className="py-2 pr-4">
                      <Badge variant={p.hasConsent ? "default" : "secondary"}>
                        {p.hasConsent ? "Aceptado" : "Pendiente"}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">
                      {p.completedSessions} / {p.totalSessions} completadas
                    </td>
                    <td className="py-2 pr-4">
                      {p.lastReport ? (
                        <span>
                          {STATUS_LABEL[p.lastReport.status]}{" "}
                          <span className="text-muted-foreground">
                            · {formatDate(p.lastReport.requested_at)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      {p.stuck && p.lastReport ? (
                        <RetryReportButton sessionId={p.lastReport.session_id} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
