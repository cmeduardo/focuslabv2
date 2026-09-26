import { NextResponse, type NextRequest } from "next/server";

import { completeSessionAndRequestReport } from "@/lib/services/ai-reports";
import { createClient } from "@/lib/supabase/server";

// RF-10: el participante cierra su sesión de uso y dispara la generación del
// informe de perfil atencional. Ver ARCHITECTURE.md §7.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const session = await completeSessionAndRequestReport(supabase, {
    sessionId,
    userId: user.id,
  });

  if (!session) {
    return NextResponse.json(
      { error: "La sesión no existe o ya fue completada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
