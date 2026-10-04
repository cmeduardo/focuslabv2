import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { PendingAutoRefresh } from "@/components/reports/pending-auto-refresh";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAiReport } from "@/lib/services/ai-reports";
import { createClient } from "@/lib/supabase/server";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-GT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    // Se renderiza en el servidor (UTC en Vercel): fijar la zona del taller.
    timeZone: "America/Guatemala",
  });
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-foreground">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function InformeDetallePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const report = await getAiReport(supabase, sessionId, user.id);

  if (!report) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/informes"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Mis informes
      </Link>

      {report.status === "pendiente" && (
        <>
          <PendingAutoRefresh />
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="font-heading font-medium">
                Generando tu informe…
              </p>
              <p className="text-sm text-muted-foreground">
                Puede tardar unos segundos. Esta página se actualiza sola.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {report.status === "fallido" && (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <XCircle className="size-6 text-destructive" />
            <p className="font-heading font-medium">
              No se pudo generar el informe
            </p>
            <p className="text-sm text-muted-foreground">
              Completa una nueva sesión para volver a intentarlo.
            </p>
          </CardContent>
        </Card>
      )}

      {report.status === "completado" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-heading text-xl">
                  Perfil atencional
                </CardTitle>
                <Badge className="gap-1">
                  <CheckCircle2 className="size-3" />
                  Completado
                </Badge>
              </div>
              {report.completed_at && (
                <CardDescription>
                  Generado el {formatDate(report.completed_at)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-foreground">
                {report.attentional_profile}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <ReportList title="Fortalezas" items={report.strengths} />
            <ReportList
              title="Áreas de mejora"
              items={report.areas_for_improvement}
            />
          </div>

          <ReportList title="Recomendaciones" items={report.recommendations} />
        </div>
      )}
    </div>
  );
}
