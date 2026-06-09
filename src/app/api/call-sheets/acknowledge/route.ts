import { requireAdminClient } from "@/lib/api/admin-service";
import { departmentsMatch } from "@/lib/call-sheets/constants";
import { isRecipientForUser } from "@/lib/call-sheets/inbox";
import { logSupabaseError } from "@/lib/supabase/errors";
import { mapProjectMember } from "@/lib/supabase/mappers";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    recipientId?: string;
    projectId?: string;
    userAgent?: string;
  };

  const recipientId = body.recipientId?.trim();
  const projectId = body.projectId?.trim();

  if (!recipientId || !projectId) {
    return NextResponse.json(
      { error: "recipientId e projectId sono obbligatori" },
      { status: 400 }
    );
  }

  try {
    const { data: recipient, error: recipErr } = await supabase
      .from("call_sheet_recipients")
      .select("*")
      .eq("id", recipientId)
      .eq("project_id", projectId)
      .single();

    if (recipErr || !recipient) {
      return NextResponse.json(
        { error: "Destinatario non trovato" },
        { status: 404 }
      );
    }

    const { data: memberRow, error: memberErr } = await supabase
      .from("project_members")
      .select("*, profiles(email, full_name, global_role)")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .eq("access_status", "active")
      .maybeSingle();

    if (memberErr || !memberRow) {
      return NextResponse.json(
        { error: "Accesso al progetto non autorizzato" },
        { status: 403 }
      );
    }

    const membership = mapProjectMember(memberRow);

    if (
      !isRecipientForUser(
        {
          id: recipient.id,
          distribution_id: recipient.distribution_id,
          company_id: recipient.company_id,
          project_id: recipient.project_id,
          user_id: recipient.user_id ?? undefined,
          department: recipient.department ?? undefined,
          recipient_type: recipient.recipient_type,
          created_at: recipient.created_at,
          updated_at: recipient.updated_at,
        },
        user.id,
        membership.department
      )
    ) {
      return NextResponse.json(
        { error: "Non sei destinatario di questa call sheet" },
        { status: 403 }
      );
    }

    const ts = new Date().toISOString();
    const userAgent = body.userAgent?.slice(0, 200) ?? null;

    const { data: existingUserRow } = await supabase
      .from("call_sheet_recipients")
      .select("*")
      .eq("distribution_id", recipient.distribution_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingUserRow?.acknowledged_at) {
      return NextResponse.json({ ok: true, already: true });
    }

    if (existingUserRow && !existingUserRow.acknowledged_at) {
      const { error: updateErr } = await supabase
        .from("call_sheet_recipients")
        .update({
          acknowledged_at: ts,
          acknowledged_by: user.id,
          acknowledged_user_agent: userAgent,
          updated_at: ts,
        })
        .eq("id", existingUserRow.id)
        .eq("user_id", user.id)
        .is("acknowledged_at", null);

      if (updateErr) {
        logSupabaseError("acknowledge — update existing user row", updateErr, {
          recipientId: existingUserRow.id,
        });
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (recipient.user_id === user.id && !recipient.acknowledged_at) {
      const { error: updateErr } = await supabase
        .from("call_sheet_recipients")
        .update({
          acknowledged_at: ts,
          acknowledged_by: user.id,
          acknowledged_user_agent: userAgent,
          updated_at: ts,
        })
        .eq("id", recipient.id)
        .eq("user_id", user.id)
        .is("acknowledged_at", null);

      if (updateErr) {
        logSupabaseError("acknowledge — update own row", updateErr, { recipientId });
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (!recipient.user_id && recipient.department) {
      if (!departmentsMatch(recipient.department, membership.department)) {
        return NextResponse.json(
          { error: "Reparto non corrispondente" },
          { status: 403 }
        );
      }

      const admin = requireAdminClient();
      const { error: insertErr } = await admin.from("call_sheet_recipients").insert({
        distribution_id: recipient.distribution_id,
        company_id: recipient.company_id,
        project_id: recipient.project_id,
        user_id: user.id,
        email: membership.email ?? user.email ?? null,
        full_name: membership.full_name ?? null,
        department: membership.department ?? recipient.department,
        recipient_type: "user",
        target_key: recipient.target_key ?? null,
        acknowledged_at: ts,
        acknowledged_by: user.id,
        acknowledged_user_agent: userAgent,
      });

      if (insertErr) {
        logSupabaseError("acknowledge — claim dept row", insertErr, {
          recipientId,
          userId: user.id,
        });
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, claimed: true });
    }

    return NextResponse.json(
      { error: "Conferma non disponibile per questo destinatario" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[FilmOps] acknowledge route error:", error);
    const message =
      error instanceof Error ? error.message : "Errore conferma presa visione";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
