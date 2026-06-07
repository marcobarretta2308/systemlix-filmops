import { syncProfileForAuthUser } from "@/lib/supabase/profile-sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function resolveAuthUser(request: Request) {
  const admin = createAdminClient();
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (bearer && admin) {
    const { data, error } = await admin.auth.getUser(bearer);
    if (!error && data.user) {
      return data.user;
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(request: Request) {
  const authUser = await resolveAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { profile, error } = await syncProfileForAuthUser({
    id: authUser.id,
    email: authUser.email,
    user_metadata: authUser.user_metadata,
  });

  if (error || !profile) {
    return NextResponse.json(
      {
        error: error ?? "Impossibile sincronizzare il profilo",
        authId: authUser.id,
        sql: `insert into public.profiles (id, email, full_name, global_role, auth_status)
values (
  '${authUser.id}',
  '${authUser.email ?? ""}',
  'Nome',
  'platform_owner',
  'active'
)
on conflict (id) do update set
  global_role = excluded.global_role,
  auth_status = excluded.auth_status;`,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ profile });
}
