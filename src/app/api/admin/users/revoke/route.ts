import { verifyPlatformOwner } from "@/lib/api/verify-platform-owner";
import { isAdminApiConfigured } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await verifyPlatformOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));

  // TODO: revoke company_members / project_members access_status
  // and optionally update profiles.auth_status via admin client.
  if (!isAdminApiConfigured()) {
    return NextResponse.json(
      {
        error: "Admin API non configurata",
        todo: "Implementare revoca accessi con service role",
        received: body,
      },
      { status: 501 }
    );
  }

  return NextResponse.json(
    {
      message: "TODO: implementare revoca accesso utente",
      performedBy: auth.userId,
    },
    { status: 501 }
  );
}
