import { verifyPlatformOwner } from "@/lib/api/verify-platform-owner";
import { isAdminApiConfigured } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const auth = await verifyPlatformOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));

  // TODO: use createAdminClient() + supabase.auth.admin.createUser()
  // with SUPABASE_SERVICE_ROLE_KEY (server-only, never NEXT_PUBLIC).
  if (!isAdminApiConfigured()) {
    return NextResponse.json(
      {
        error: "Admin API non configurata",
        todo: "Impostare SUPABASE_SERVICE_ROLE_KEY e implementare createUser",
        received: body,
      },
      { status: 501 }
    );
  }

  return NextResponse.json(
    {
      message: "TODO: implementare creazione utente via Admin API",
      performedBy: auth.userId,
    },
    { status: 501 }
  );
}
