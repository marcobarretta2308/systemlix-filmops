import { adminRouteErrorResponse } from "@/lib/api/admin-route";
import {
  requireAdminClient,
  resolveUserIdByEmail,
  upsertCompanyMember,
} from "@/lib/api/admin-service";
import { verifyPlatformOwner } from "@/lib/api/verify-admin";
import { logAdminEnvStatus } from "@/lib/supabase/admin";
import type { CompanyRole, MemberStatus } from "@/lib/types";
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
    company_id?: string;
    role?: CompanyRole;
    status?: MemberStatus;
    access_start_date?: string;
    access_end_date?: string;
  };

  const companyId = body.company_id?.trim();
  if (!companyId) {
    return NextResponse.json({ error: "company_id obbligatorio" }, { status: 400 });
  }

  try {
    logAdminEnvStatus("assign company");
    const admin = requireAdminClient();

    let userId = body.user_id?.trim();
    if (!userId && body.email) {
      userId = (await resolveUserIdByEmail(admin, body.email)) ?? undefined;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Utente non trovato (user_id o email validi)" },
        { status: 404 }
      );
    }

    const memberId = await upsertCompanyMember(admin, {
      company_id: companyId,
      user_id: userId,
      role: (body.role ?? "producer") as CompanyRole,
      status: body.status ?? "active",
      access_start_date: body.access_start_date,
      access_end_date: body.access_end_date,
    });

    return NextResponse.json({ success: true, company_member_id: memberId, user_id: userId });
  } catch (error) {
    return adminRouteErrorResponse("assign company", error, "Assegnazione produzione fallita");
  }
}
