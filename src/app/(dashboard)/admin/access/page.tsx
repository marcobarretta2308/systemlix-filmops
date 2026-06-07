"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { Select } from "@/components/ui/Select";
import { Toast } from "@/components/ui/Toast";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "@/components/ui/Table";
import { useAuth, useCompany } from "@/lib/context/PlatformContext";
import {
  AUTH_STATUS_LABELS,
  GLOBAL_ROLE_LABELS,
  MEMBER_ACCESS_LABELS,
  PROJECT_ACCESS_LABELS,
} from "@/lib/access-control";
import {
  COMPANY_ROLE_LABELS,
  PROJECT_ROLE_LABELS,
} from "@/lib/permissions";
import type { AccessStatus, AuthStatus, CompanyRole, MemberStatus, ProjectRole } from "@/lib/types";
import { Shield, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AdminTab = "users" | "company" | "project";

async function callAdminApi(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function AccessManagementPage() {
  const { user, isPlatformOwner } = useAuth();
  const { userCompanies } = useCompany();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("users");
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    password: "",
    global_role: "user" as "user" | "platform_owner",
    auth_status: "active" as AuthStatus,
  });

  const [companyAssign, setCompanyAssign] = useState({
    email: "",
    company_id: "",
    role: "company_admin" as CompanyRole,
    status: "active" as MemberStatus,
    access_start_date: "",
    access_end_date: "",
  });

  const [projectAssign, setProjectAssign] = useState({
    email: "",
    project_id: "",
    role: "producer" as ProjectRole,
    access_status: "active" as AccessStatus,
    access_start_date: "",
    access_end_date: "",
  });

  useEffect(() => {
    if (user && !isPlatformOwner) {
      router.replace("/dashboard");
    }
  }, [user, isPlatformOwner, router]);

  if (!user || !isPlatformOwner) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        Accesso riservato al Platform Owner.
      </p>
    );
  }

  const handleCreateUser = async () => {
    setSubmitting(true);
    const result = await callAdminApi("/api/admin/users/create", newUser);
    setSubmitting(false);
    if (result.status === 501) {
      setToast("Funzione in preparazione — Admin API server-side (TODO).");
    } else if (result.ok) {
      setToast("Utente creato.");
      setNewUser({ email: "", full_name: "", password: "", global_role: "user", auth_status: "active" });
    } else {
      setToast(result.data.error ?? "Errore creazione utente.");
    }
  };

  const handleRevoke = async (scope: "company" | "project" | "user") => {
    setSubmitting(true);
    const payload =
      scope === "company"
        ? { scope, ...companyAssign, action: "revoke_company" }
        : scope === "project"
          ? { scope, ...projectAssign, action: "revoke_project" }
          : { email: newUser.email, action: "revoke_user" };
    const result = await callAdminApi("/api/admin/users/revoke", payload);
    setSubmitting(false);
    setToast(
      result.status === 501
        ? "Revoca accessi — TODO server action con service role."
        : result.ok
          ? "Accesso revocato."
          : (result.data.error ?? "Errore revoca.")
    );
  };

  const handleBan = async () => {
    setSubmitting(true);
    const result = await callAdminApi("/api/admin/users/ban", {
      email: newUser.email,
      auth_status: "banned",
    });
    setSubmitting(false);
    setToast(
      result.status === 501
        ? "Disabilitazione utente — TODO Admin API."
        : result.ok
          ? "Utente disabilitato."
          : (result.data.error ?? "Errore.")
    );
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "users", label: "Utenti" },
    { id: "company", label: "Produzione" },
    { id: "project", label: "Progetto" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestione accessi"
        description="Piattaforma invite-only — creazione e revoca utenti (Platform Owner)"
        badge={
          <Badge variant="violet" size="sm">
            <Shield className="h-3 w-3" /> Platform Admin
          </Badge>
        }
      />

      <PremiumCard padding="sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "primary" : "ghost"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </PremiumCard>

      {tab === "users" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <PremiumCard padding="md">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-[14px] font-medium text-[var(--text-primary)]">
                Crea nuovo utente
              </h3>
            </div>
            <div className="space-y-3">
              <Input label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
              <Input label="Nome completo" value={newUser.full_name} onChange={(e) => setNewUser((p) => ({ ...p, full_name: e.target.value }))} />
              <Input label="Password temporanea" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
              <Select
                label="Ruolo globale"
                value={newUser.global_role}
                onChange={(e) => setNewUser((p) => ({ ...p, global_role: e.target.value as "user" | "platform_owner" }))}
                options={Object.entries(GLOBAL_ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <Select
                label="Stato account"
                value={newUser.auth_status}
                onChange={(e) => setNewUser((p) => ({ ...p, auth_status: e.target.value as AuthStatus }))}
                options={Object.entries(AUTH_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <Button onClick={handleCreateUser} disabled={submitting || !newUser.email} size="sm" className="w-full">
                Crea utente (server)
              </Button>
              <p className="text-[11px] text-[var(--text-muted)]">
                TODO: Supabase Admin API via service role — mai esposta al browser.
              </p>
            </div>
          </PremiumCard>

          <PremiumCard padding="md">
            <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">
              Azioni account
            </h3>
            <div className="space-y-2">
              <Button variant="danger" size="sm" className="w-full" disabled={submitting || !newUser.email} onClick={handleBan}>
                Disabilita / ban utente
              </Button>
              <Button variant="outline" size="sm" className="w-full" disabled={submitting || !newUser.email} onClick={() => handleRevoke("user")}>
                Revoca accesso globale
              </Button>
              <Button variant="ghost" size="sm" className="w-full" disabled>
                Elimina utente placeholder (TODO)
              </Button>
            </div>
          </PremiumCard>
        </div>
      )}

      {tab === "company" && (
        <PremiumCard padding="md">
          <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">
            Assegna utente a produzione
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Email utente" value={companyAssign.email} onChange={(e) => setCompanyAssign((p) => ({ ...p, email: e.target.value }))} />
            <Select
              label="Produzione"
              value={companyAssign.company_id}
              onChange={(e) => setCompanyAssign((p) => ({ ...p, company_id: e.target.value }))}
              options={[
                { value: "", label: "Seleziona…" },
                ...userCompanies.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <Select
              label="Ruolo"
              value={companyAssign.role}
              onChange={(e) => setCompanyAssign((p) => ({ ...p, role: e.target.value as CompanyRole }))}
              options={Object.entries(COMPANY_ROLE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label="Accesso"
              value={companyAssign.status}
              onChange={(e) => setCompanyAssign((p) => ({ ...p, status: e.target.value as MemberStatus }))}
              options={Object.entries(MEMBER_ACCESS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Input label="Inizio accesso" type="date" value={companyAssign.access_start_date} onChange={(e) => setCompanyAssign((p) => ({ ...p, access_start_date: e.target.value }))} />
            <Input label="Fine accesso" type="date" value={companyAssign.access_end_date} onChange={(e) => setCompanyAssign((p) => ({ ...p, access_end_date: e.target.value }))} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" disabled={submitting}>Assegna (TODO)</Button>
            <Button variant="outline" size="sm" disabled={submitting} onClick={() => handleRevoke("company")}>
              Revoca produzione
            </Button>
          </div>
        </PremiumCard>
      )}

      {tab === "project" && (
        <PremiumCard padding="md">
          <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">
            Assegna utente a progetto
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Email utente" value={projectAssign.email} onChange={(e) => setProjectAssign((p) => ({ ...p, email: e.target.value }))} />
            <Input label="ID progetto" value={projectAssign.project_id} onChange={(e) => setProjectAssign((p) => ({ ...p, project_id: e.target.value }))} placeholder="UUID progetto" />
            <Select
              label="Ruolo progetto"
              value={projectAssign.role}
              onChange={(e) => setProjectAssign((p) => ({ ...p, role: e.target.value as ProjectRole }))}
              options={Object.entries(PROJECT_ROLE_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Select
              label="Stato accesso"
              value={projectAssign.access_status}
              onChange={(e) => setProjectAssign((p) => ({ ...p, access_status: e.target.value as AccessStatus }))}
              options={Object.entries(PROJECT_ACCESS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Input label="Inizio accesso" type="date" value={projectAssign.access_start_date} onChange={(e) => setProjectAssign((p) => ({ ...p, access_start_date: e.target.value }))} />
            <Input label="Fine accesso" type="date" value={projectAssign.access_end_date} onChange={(e) => setProjectAssign((p) => ({ ...p, access_end_date: e.target.value }))} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" disabled={submitting}>Assegna (TODO)</Button>
            <Button variant="outline" size="sm" disabled={submitting} onClick={() => handleRevoke("project")}>
              Revoca progetto
            </Button>
          </div>
        </PremiumCard>
      )}

      <PremiumCard padding="md">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-[var(--text-muted)]" />
          <h3 className="text-[14px] font-medium text-[var(--text-primary)]">
            Utenti piattaforma
          </h3>
        </div>
        <EmptyState
          icon={Users}
          title="Lista utenti in arrivo"
          description="Il caricamento utenti da Supabase richiede Admin API server-side. Usa i form sopra per le operazioni pianificate."
        />
        <Table className="mt-4 hidden">
          <TableHead>
            <TableRow>
              <TableTh>Utente</TableTh>
              <TableTh>Ruolo</TableTh>
              <TableTh>Stato</TableTh>
              <TableTh className="text-right">Azioni</TableTh>
            </TableRow>
          </TableHead>
          <TableBody />
        </Table>
      </PremiumCard>

      <Toast message={toast ?? ""} open={!!toast} onClose={() => setToast(null)} />
    </div>
  );
}
