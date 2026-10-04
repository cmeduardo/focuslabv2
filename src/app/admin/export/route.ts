import { NextResponse, type NextRequest } from "next/server";

import { buildDatasetCsv, isExportDataset } from "@/lib/services/admin-stats";
import { createClient } from "@/lib/supabase/server";

// RF-14: exportación CSV de las vistas agregadas y anonimizadas (RS-04).
// Disponible para investigador y autoridad; nunca incluye datos individuales.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "investigador" && profile?.role !== "autoridad") {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const dataset = request.nextUrl.searchParams.get("dataset");

  if (!isExportDataset(dataset)) {
    return NextResponse.json({ error: "Dataset inválido." }, { status: 400 });
  }

  const csv = await buildDatasetCsv(supabase, dataset);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="focuslab-${dataset}.csv"`,
    },
  });
}
