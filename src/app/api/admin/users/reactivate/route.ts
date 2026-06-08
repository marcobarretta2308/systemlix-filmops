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
  };

  const userId = body.user_id?.trim();
  if (!userId) {
    return NextResponse.json({ error: "user_id obbligatorio" }, { status: 400 });
  }

  try {
    logAdminEnvStatus("reactivate user");
    const admin = requireAdminClient();

    const { error: profileError } = await admin
      .from("profiles")
      .update({ auth_status: "active" })
      .eq("id", userId);
    if (profileError) throw profileError;

    return NextResponse.json({ success: true, user_id: userId });
  } catch (error) {
    return adminRouteErrorResponse("reactivate user", error, "Riattivazione fallita");
  }
}
