import { verifyPlatformOwner } from "@/lib/api/verify-platform-owner";
import { isAdminApiConfigured } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await verifyPlatformOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));

  // TODO: supabase.auth.admin.updateUserById({ ban_duration: '...' })
  // and profiles.auth_status = 'banned' via service role.
  if (!isAdminApiConfigured()) {
    return NextResponse.json(
      {
        error: "Admin API non configurata",
        todo: "Implementare ban/disabilitazione con service role",
        received: body,
      },
      { status: 501 }
    );
  }

  return NextResponse.json(
    {
      message: "TODO: implementare ban/disabilitazione utente",
      performedBy: auth.userId,
    },
    { status: 501 }
  );
}
