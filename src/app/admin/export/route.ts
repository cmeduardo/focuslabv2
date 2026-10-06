import { NextResponse, type NextRequest } from "next/server";

import { buildDatasetCsv, canExport, isExportDataset } from "@/lib/services/admin-stats";
import { createClient } from "@/lib/supabase/server";

// RF-14: exportación CSV. Los datasets agregados (RS-04) están disponibles
// para investigador y autoridad; los de nivel participante o ensayo
// (seudonimizados, para Power BI/análisis estadístico) solo para el
// investigador. La base vuelve a aplicar el mismo filtro en cada vista.
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

  if (!canExport(dataset, profile.role)) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const csv = await buildDatasetCsv(supabase, dataset);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="focuslab-${dataset}.csv"`,
    },
  });
}
