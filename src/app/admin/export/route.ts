import { NextResponse, type NextRequest } from "next/server";

import { buildDatasetCsv, canExport, isExportDataset } from "@/lib/services/admin-stats";
import { sesionStaffVerificada } from "@/lib/services/verificacion-staff";
import { createClient } from "@/lib/supabase/server";

// Los datasets por participante o por ensayo son solo del investigador.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "investigador" && profile?.rol !== "autoridad") {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  if (!(await sesionStaffVerificada(supabase))) {
    return NextResponse.json({ error: "Falta confirmar el código de acceso." }, { status: 403 });
  }

  const dataset = request.nextUrl.searchParams.get("dataset");

  if (!isExportDataset(dataset)) {
    return NextResponse.json({ error: "Dataset inválido." }, { status: 400 });
  }

  if (!canExport(dataset, profile.rol)) {
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
