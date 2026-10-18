import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// sendBeacon al cerrar la página a mitad de la ronda. Solo pasa de 'en_curso' a 'incompleta'.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  await supabase
    .from("activity_runs")
    .update({ status: "incompleta", ended_at: new Date().toISOString() })
    .eq("id", runId)
    .eq("user_id", user.id)
    .eq("status", "en_curso");

  return new NextResponse(null, { status: 204 });
}
