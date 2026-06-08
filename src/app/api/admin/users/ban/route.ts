import { adminRouteErrorResponse } from "@/lib/api/admin-route";
import { requireAdminClient } from "@/lib/api/admin-service";
import { verifyPlatformOwner } from "@/lib/api/verify-admin";
import { logAdminEnvStatus } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await verifyPlatformOwner();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    user_id?: string;
    email?: string;
    auth_status?: "banned" | "active";
  };

  try {
    logAdminEnvStatus("ban user");
    const admin = requireAdminClient();

    let userId = body.user_id?.trim();
    if (!userId && body.email) {
      const { data } = await admin
        .from("profiles")
        .select("id")
        .eq("email", body.email.trim().toLowerCase())
        .maybeSingle();
      userId = data?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    const status = body.auth_status ?? "banned";

    const { error } = await admin
      .from("profiles")
      .update({ auth_status: status })
      .eq("id", userId);
    if (error) throw error;

    return NextResponse.json({ success: true, user_id: userId, auth_status: status });
  } catch (error) {
    return adminRouteErrorResponse("ban user", error, "Operazione fallita");
  }
}
