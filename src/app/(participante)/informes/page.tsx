import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listAiReports } from "@/lib/services/ai-reports";
import { createClient } from "@/lib/supabase/server";
import type { AiReportStatus } from "@/lib/types/database";

const STATUS_LABEL: Record<AiReportStatus, string> = {
  pendiente: "Generando…",
  completado: "Completado",
  fallido: "No se pudo generar",
};

const STATUS_VARIANT: Record<
  AiReportStatus,
  "secondary" | "default" | "destructive"
> = {
  pendiente: "secondary",
  completado: "default",
  fallido: "destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function InformesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reports = user ? await listAiReports(supabase, user.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Mis informes
        </h1>
        <p className="text-muted-foreground">
          Perfil atencional generado por IA al completar cada sesión (RF-11,
          RF-12).
        </p>
      </div>

      {reports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <FileText className="size-8 text-muted-foreground" />
            <p className="font-heading font-medium">
              Todavía no tenés informes
            </p>
            <p className="text-sm text-muted-foreground">
              Completá una sesión de actividades para generar tu primer
              informe.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Link key={report.id} href={`/informes/${report.session_id}`}>
              <Card className="transition-colors hover:border-primary/30">
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-heading font-medium">
                      {report.sessionStartedAt
                        ? formatDate(report.sessionStartedAt)
                        : "Sesión"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Solicitado {formatDate(report.requested_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_VARIANT[report.status]}>
                      {STATUS_LABEL[report.status]}
                    </Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
