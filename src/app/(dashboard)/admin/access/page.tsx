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
import { useAuth, useCompany, useProject } from "@/lib/context/PlatformContext";
import { getClientOrNull } from "@/lib/supabase/client";
import {
  fetchAllCompanies,
  fetchAllProjects,
  fetchAllWorkspaces,
} from "@/lib/supabase/data";
import { operationFailed } from "@/lib/utils/user-facing-error";
import type { Workspace } from "@/lib/types";
import {
  AUTH_STATUS_LABELS,
  GLOBAL_ROLE_LABELS,
  MEMBER_ACCESS_LABELS,
  PROJECT_ACCESS_LABELS,
} from "@/lib/access-control";
import { DEPARTMENT_OPTIONS } from "@/lib/permissions/project-permissions";
import {
  COMPANY_ROLE_LABELS,
  PROJECT_ROLE_LABELS,
} from "@/lib/permissions";
import type {
  AccessStatus,
  AuthStatus,
  CompanyRole,
  MemberStatus,
  ProjectRole,
} from "@/lib/types";
import { Building2, FolderKanban, Shield, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type AdminTab = "users" | "create" | "company" | "project" | "revoke";

type ListedUser = {
  id: string;
  email: string;
  full_name: string;
  global_role: string;
  auth_status: string;
  company_memberships: Array<{ company_id: string; role: string; status: string; company_name: string }>;
  project_memberships: Array<{
    project_id: string;
    role: string;
    department?: string;
    access_status: string;
    project_title: string;
  }>;
};

type ListedCompany = { id: string; name: string };
type ListedProject = {
  id: string;
  title: string;
  company_id: string;
  workspace_id: string;
};

function projectOptionLabel(
  project: ListedProject,
  companies: ListedCompany[],
  workspaces: Workspace[]
): string {
  const companyName = companies.find((c) => c.id === project.company_id)?.name;
  const workspaceName = workspaces.find((w) => w.id === project.workspace_id)?.name;
  const suffix = [companyName, workspaceName].filter(Boolean).join(" · ");
  return suffix ? `${project.title} (${suffix})` : project.title;
}

type CreateSuccess = {
  email: string;
  password: string;
  company_name: string;
  project_title: string | null;
  role: string;
  department: string | null;
  access_end_date: string | null;
};

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
  const { activeCompany, userCompanies } = useCompany();
  const { activeProject, accessibleProjectsAll } = useProject();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("users");
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error" | "warning">("success");
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [formDataError, setFormDataError] = useState<string | null>(null);
  const [formPrefilled, setFormPrefilled] = useState(false);
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [companies, setCompanies] = useState<ListedCompany[]>([]);
  const [projects, setProjects] = useState<ListedProject[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [createSuccess, setCreateSuccess] = useState<CreateSuccess | null>(null);

  const [createForm, setCreateForm] = useState({
    email: "",
    full_name: "",
    password: "",
    company_id: "",
    project_id: "",
    role: "department_user" as ProjectRole,
    department: "Costumi",
    company_role: "producer" as CompanyRole,
    access_start_date: "",
    access_end_date: "",
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
    department: "",
    permission_profile: "",
    access_status: "active" as AccessStatus,
    access_start_date: "",
    access_end_date: "",
  });

  const [revokeForm, setRevokeForm] = useState({
    user_id: "",
    company_id: "",
    project_id: "",
    scope: "project" as "company" | "project" | "all",
  });

  const syncFormDataFromContext = useCallback(() => {
    if (userCompanies.length > 0) {
      setCompanies(userCompanies.map((c) => ({ id: c.id, name: c.name })));
    }
    if (accessibleProjectsAll.length > 0) {
      setProjects(
        accessibleProjectsAll.map((p) => ({
          id: p.id,
          title: p.title,
          company_id: p.company_id,
          workspace_id: p.workspace_id,
        }))
      );
    }
  }, [userCompanies, accessibleProjectsAll]);

  const loadFormData = useCallback(async () => {
    const supabase = getClientOrNull();
    if (!supabase) {
      setFormDataError("Supabase non configurato.");
      return;
    }

    setLoadingFormData(true);
    setFormDataError(null);

    try {
      const [companiesList, workspacesList, { projects: projectsList }] =
        await Promise.all([
          fetchAllCompanies(supabase),
          fetchAllWorkspaces(supabase),
          fetchAllProjects(supabase),
        ]);

      setCompanies(companiesList.map((c) => ({ id: c.id, name: c.name })));
      setWorkspaces(workspacesList);
      setProjects(
        projectsList.map((p) => ({
          id: p.id,
          title: p.title,
          company_id: p.company_id,
          workspace_id: p.workspace_id,
        }))
      );
    } catch (error) {
      console.error("[FilmOps Admin] load companies/projects error:", error);
      setFormDataError("Errore nel caricamento produzioni/progetti");
    } finally {
      setLoadingFormData(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const res = await fetch("/api/admin/users/list");
    const data = await res.json().catch(() => ({}));
    setLoadingUsers(false);
    if (!res.ok) {
      setToastVariant("error");
      setToast(operationFailed(data.error ?? "Could not load users"));
      return;
    }
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    if (user && !isPlatformOwner) router.replace("/dashboard");
  }, [user, isPlatformOwner, router]);

  useEffect(() => {
    if (!isPlatformOwner) return;
    syncFormDataFromContext();
    void loadFormData();
    void loadUsers();
  }, [isPlatformOwner, syncFormDataFromContext, loadFormData, loadUsers]);

  useEffect(() => {
    if (!isPlatformOwner || formPrefilled || loadingFormData) return;
    const companyId = activeCompany?.id ?? activeProject?.company_id ?? "";
    const projectId = activeProject?.id ?? "";
    if (!companyId && !projectId) return;

    setCreateForm((prev) => ({
      ...prev,
      company_id: companyId || prev.company_id,
      project_id: projectId || prev.project_id,
    }));
    setFormPrefilled(true);
  }, [
    isPlatformOwner,
    formPrefilled,
    loadingFormData,
    activeCompany,
    activeProject,
  ]);

  if (!user || !isPlatformOwner) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        Accesso riservato al Platform Owner.
      </p>
    );
  }

  const notify = (message: string, variant: "success" | "error" | "warning" = "success") => {
    setToastVariant(variant);
    setToast(message);
  };

  const handleCreateUser = async () => {
    setSubmitting(true);
    const result = await callAdminApi("/api/admin/users/create", createForm);
    setSubmitting(false);
    if (!result.ok) {
      notify(operationFailed(result.data.error ?? "Could not create user"), "error");
      return;
    }
    setCreateSuccess({
      email: result.data.email,
      password: result.data.password,
      company_name: result.data.company_name,
      project_title: result.data.project_title,
      role: result.data.role,
      department: result.data.department,
      access_end_date: result.data.access_end_date,
    });
    notify("Utente creato e accesso assegnato.");
    loadUsers();
  };

  const handleAssignCompany = async () => {
    setSubmitting(true);
    const result = await callAdminApi("/api/admin/users/assign-company", companyAssign);
    setSubmitting(false);
    notify(
      result.ok
        ? "Utente assegnato alla produzione."
        : operationFailed(result.data.error ?? "Could not assign to company"),
      result.ok ? "success" : "error"
    );
    if (result.ok) loadUsers();
  };

  const handleAssignProject = async () => {
    setSubmitting(true);
    const result = await callAdminApi("/api/admin/users/assign-project", projectAssign);
    setSubmitting(false);
    notify(
      result.ok
        ? "Utente assegnato al progetto."
        : operationFailed(result.data.error ?? "Could not assign to project"),
      result.ok ? "success" : "error"
    );
    if (result.ok) loadUsers();
  };

  const handleRevoke = async () => {
    if (!revokeForm.user_id) {
      notify("Seleziona un utente da revocare.", "warning");
      return;
    }
    setSubmitting(true);
    const result = await callAdminApi("/api/admin/users/revoke", revokeForm);
    setSubmitting(false);
    notify(
      result.ok
        ? "Accesso revocato."
        : operationFailed(result.data.error ?? "Could not revoke access"),
      result.ok ? "success" : "error"
    );
    if (result.ok) loadUsers();
  };

  const handleSuspend = async (userId: string) => {
    setSubmitting(true);
    const result = await callAdminApi("/api/admin/users/suspend", { user_id: userId });
    setSubmitting(false);
    notify(
      result.ok
        ? "Utente sospeso."
        : operationFailed(result.data.error ?? "Could not suspend user"),
      result.ok ? "success" : "error"
    );
    if (result.ok) loadUsers();
  };

  const handleReactivate = async (userId: string) => {
    setSubmitting(true);
    const result = await callAdminApi("/api/admin/users/reactivate", { user_id: userId });
    setSubmitting(false);
    notify(
      result.ok
        ? "Utente riattivato."
        : operationFailed(result.data.error ?? "Could not reactivate user"),
      result.ok ? "success" : "error"
    );
    if (result.ok) loadUsers();
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "users", label: "Utenti" },
    { id: "create", label: "Crea utente" },
    { id: "company", label: "Assegna produzione" },
    { id: "project", label: "Assegna progetto" },
    { id: "revoke", label: "Revoca accessi" },
  ];

  const selectedCompanyId = createForm.company_id;
  const selectedProjectId = createForm.project_id;
  const selectedRole = createForm.role;
  const selectedDepartment = createForm.department;

  const filteredProjects = projects.filter((p) =>
    selectedCompanyId ? p.company_id === selectedCompanyId : true
  );

  const companyOptions = [
    { value: "", label: "Seleziona produzione…" },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];

  const projectOptions = [
    { value: "", label: selectedCompanyId ? "Seleziona progetto…" : "Opzionale — tutti i progetti" },
    ...filteredProjects.map((p) => ({
      value: p.id,
      label: projectOptionLabel(p, companies, workspaces),
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestione accessi"
        description="Creazione utenti, assegnazione ruoli/reparti e permessi operativi"
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
        <PremiumCard padding="md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-[14px] font-medium text-[var(--text-primary)]">
                Utenti piattaforma
              </h3>
            </div>
            <Button size="sm" variant="outline" onClick={loadUsers} disabled={loadingUsers}>
              Aggiorna
            </Button>
          </div>
          {users.length === 0 ? (
            <EmptyState
              icon={Users}
              title={loadingUsers ? "Caricamento..." : "Nessun utente"}
              description="Crea il primo utente dalla tab Crea utente."
            />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableTh>Utente</TableTh>
                  <TableTh>Ruolo</TableTh>
                  <TableTh>Stato</TableTh>
                  <TableTh>Assegnazioni</TableTh>
                  <TableTh className="text-right">Azioni</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableTd>
                      <p className="font-medium text-[var(--text-primary)]">{u.full_name || "—"}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{u.email}</p>
                    </TableTd>
                    <TableTd>{GLOBAL_ROLE_LABELS[u.global_role as keyof typeof GLOBAL_ROLE_LABELS] ?? u.global_role}</TableTd>
                    <TableTd>{AUTH_STATUS_LABELS[u.auth_status as AuthStatus] ?? u.auth_status}</TableTd>
                    <TableTd className="text-[11px] text-[var(--text-muted)]">
                      {u.company_memberships.length} prod. · {u.project_memberships.length} prog.
                    </TableTd>
                    <TableTd className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" disabled={submitting} onClick={() => handleReactivate(u.id)}>
                          Riattiva
                        </Button>
                        <Button size="sm" variant="subtle" disabled={submitting} onClick={() => handleSuspend(u.id)}>
                          Sospendi
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={submitting}
                          onClick={() => {
                            setRevokeForm((p) => ({ ...p, user_id: u.id, scope: "all" }));
                            setTab("revoke");
                          }}
                        >
                          Revoca
                        </Button>
                      </div>
                    </TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </PremiumCard>
      )}

      {tab === "create" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <PremiumCard padding="md">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="h-4 w-4 text-[var(--text-muted)]" />
              <h3 className="text-[14px] font-medium text-[var(--text-primary)]">
                Crea utente e assegna accesso
              </h3>
            </div>
            {loadingFormData && companies.length === 0 && projects.length === 0 ? (
              <p className="text-[13px] text-[var(--text-muted)]">
                Caricamento produzioni e progetti...
              </p>
            ) : formDataError && companies.length === 0 ? (
              <EmptyState
                icon={Shield}
                title="Errore nel caricamento produzioni/progetti"
                description={formDataError}
              />
            ) : companies.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="Nessuna produzione disponibile"
                description="Crea prima una produzione."
              />
            ) : (
              <div className="space-y-3">
                <Input label="Nome completo" value={createForm.full_name} onChange={(e) => setCreateForm((p) => ({ ...p, full_name: e.target.value }))} />
                <Input label="Email" type="email" value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
                <Input label="Password temporanea" type="password" value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
                <Select
                  label="Produzione"
                  value={selectedCompanyId}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      company_id: e.target.value,
                      project_id:
                        p.project_id &&
                        projects.find((pr) => pr.id === p.project_id)?.company_id !== e.target.value
                          ? ""
                          : p.project_id,
                    }))
                  }
                  options={companyOptions}
                />
                {projects.length === 0 ? (
                  <EmptyState
                    icon={FolderKanban}
                    title="Nessun progetto disponibile"
                    description="Crea prima un progetto."
                  />
                ) : (
                  <Select
                    label="Progetto"
                    value={selectedProjectId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, project_id: e.target.value }))}
                    options={projectOptions}
                  />
                )}
                <Select
                  label="Ruolo progetto"
                  value={selectedRole}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as ProjectRole }))}
                  options={Object.entries(PROJECT_ROLE_LABELS).map(([value, label]) => ({ value, label }))}
                />
                <Select
                  label="Reparto"
                  value={selectedDepartment}
                  onChange={(e) => setCreateForm((p) => ({ ...p, department: e.target.value }))}
                  options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
                />
                <Input label="Inizio accesso" type="date" value={createForm.access_start_date} onChange={(e) => setCreateForm((p) => ({ ...p, access_start_date: e.target.value }))} />
                <Input label="Fine accesso" type="date" value={createForm.access_end_date} onChange={(e) => setCreateForm((p) => ({ ...p, access_end_date: e.target.value }))} />
                <Button
                  onClick={handleCreateUser}
                  disabled={
                    submitting ||
                    loadingFormData ||
                    !createForm.email ||
                    !createForm.password ||
                    !selectedCompanyId
                  }
                  size="sm"
                  className="w-full"
                >
                  Crea utente e assegna accesso
                </Button>
              </div>
            )}
          </PremiumCard>

          {createSuccess && (
            <PremiumCard padding="md" className="border border-[rgba(34,211,238,0.2)]">
              <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-3">
                Credenziali create
              </h3>
              <div className="space-y-2 text-[12px] text-[var(--text-secondary)]">
                <p><span className="text-[var(--text-muted)]">Email:</span> {createSuccess.email}</p>
                <p><span className="text-[var(--text-muted)]">Password temporanea:</span> {createSuccess.password}</p>
                <p><span className="text-[var(--text-muted)]">Produzione:</span> {createSuccess.company_name}</p>
                <p><span className="text-[var(--text-muted)]">Progetto:</span> {createSuccess.project_title ?? "—"}</p>
                <p><span className="text-[var(--text-muted)]">Ruolo:</span> {createSuccess.role}</p>
                <p><span className="text-[var(--text-muted)]">Reparto:</span> {createSuccess.department ?? "—"}</p>
                <p><span className="text-[var(--text-muted)]">Fine accesso:</span> {createSuccess.access_end_date ?? "—"}</p>
              </div>
              <p className="mt-4 text-[11px] text-[var(--text-muted)] leading-relaxed">
                Consegna queste credenziali alla produzione. L&apos;utente potrà accedere solo ai progetti autorizzati.
              </p>
            </PremiumCard>
          )}
        </div>
      )}

      {tab === "company" && (
        <PremiumCard padding="md">
          <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">
            Assegna utente a produzione
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Email utente" value={companyAssign.email} onChange={(e) => setCompanyAssign((p) => ({ ...p, email: e.target.value }))} />
            <Select label="Produzione" value={companyAssign.company_id} onChange={(e) => setCompanyAssign((p) => ({ ...p, company_id: e.target.value }))} options={[{ value: "", label: "Seleziona…" }, ...companies.map((c) => ({ value: c.id, label: c.name }))]} />
            <Select label="Ruolo" value={companyAssign.role} onChange={(e) => setCompanyAssign((p) => ({ ...p, role: e.target.value as CompanyRole }))} options={Object.entries(COMPANY_ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
            <Select label="Accesso" value={companyAssign.status} onChange={(e) => setCompanyAssign((p) => ({ ...p, status: e.target.value as MemberStatus }))} options={Object.entries(MEMBER_ACCESS_LABELS).map(([value, label]) => ({ value, label }))} />
            <Input label="Inizio accesso" type="date" value={companyAssign.access_start_date} onChange={(e) => setCompanyAssign((p) => ({ ...p, access_start_date: e.target.value }))} />
            <Input label="Fine accesso" type="date" value={companyAssign.access_end_date} onChange={(e) => setCompanyAssign((p) => ({ ...p, access_end_date: e.target.value }))} />
          </div>
          <Button className="mt-4" size="sm" disabled={submitting} onClick={handleAssignCompany}>
            Assegna a produzione
          </Button>
        </PremiumCard>
      )}

      {tab === "project" && (
        <PremiumCard padding="md">
          <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">
            Assegna utente a progetto
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Email utente" value={projectAssign.email} onChange={(e) => setProjectAssign((p) => ({ ...p, email: e.target.value }))} />
            <Select
              label="Progetto"
              value={projectAssign.project_id}
              onChange={(e) => setProjectAssign((p) => ({ ...p, project_id: e.target.value }))}
              options={[
                { value: "", label: "Seleziona…" },
                ...projects.map((p) => ({
                  value: p.id,
                  label: projectOptionLabel(p, companies, workspaces),
                })),
              ]}
            />
            <Select label="Ruolo progetto" value={projectAssign.role} onChange={(e) => setProjectAssign((p) => ({ ...p, role: e.target.value as ProjectRole }))} options={Object.entries(PROJECT_ROLE_LABELS).map(([value, label]) => ({ value, label }))} />
            <Select label="Reparto" value={projectAssign.department} onChange={(e) => setProjectAssign((p) => ({ ...p, department: e.target.value }))} options={[{ value: "", label: "—" }, ...DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))]} />
            <Input label="Permission profile" value={projectAssign.permission_profile} onChange={(e) => setProjectAssign((p) => ({ ...p, permission_profile: e.target.value }))} placeholder="auto da ruolo" />
            <Select label="Stato accesso" value={projectAssign.access_status} onChange={(e) => setProjectAssign((p) => ({ ...p, access_status: e.target.value as AccessStatus }))} options={Object.entries(PROJECT_ACCESS_LABELS).map(([value, label]) => ({ value, label }))} />
            <Input label="Inizio accesso" type="date" value={projectAssign.access_start_date} onChange={(e) => setProjectAssign((p) => ({ ...p, access_start_date: e.target.value }))} />
            <Input label="Fine accesso" type="date" value={projectAssign.access_end_date} onChange={(e) => setProjectAssign((p) => ({ ...p, access_end_date: e.target.value }))} />
          </div>
          <Button className="mt-4" size="sm" disabled={submitting} onClick={handleAssignProject}>
            Assegna a progetto
          </Button>
        </PremiumCard>
      )}

      {tab === "revoke" && (
        <PremiumCard padding="md">
          <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">
            Revoca accessi
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Utente"
              value={revokeForm.user_id}
              onChange={(e) => setRevokeForm((p) => ({ ...p, user_id: e.target.value }))}
              options={[{ value: "", label: "Seleziona…" }, ...users.map((u) => ({ value: u.id, label: `${u.full_name} (${u.email})` }))]}
            />
            <Select
              label="Scope revoca"
              value={revokeForm.scope}
              onChange={(e) => setRevokeForm((p) => ({ ...p, scope: e.target.value as "company" | "project" | "all" }))}
              options={[
                { value: "project", label: "Progetto" },
                { value: "company", label: "Produzione" },
                { value: "all", label: "Tutto" },
              ]}
            />
            {(revokeForm.scope === "company" || revokeForm.scope === "all") && (
              <Select label="Produzione" value={revokeForm.company_id} onChange={(e) => setRevokeForm((p) => ({ ...p, company_id: e.target.value }))} options={[{ value: "", label: "Tutte" }, ...companies.map((c) => ({ value: c.id, label: c.name }))]} />
            )}
            {(revokeForm.scope === "project" || revokeForm.scope === "all") && (
              <Select
                label="Progetto"
                value={revokeForm.project_id}
                onChange={(e) => setRevokeForm((p) => ({ ...p, project_id: e.target.value }))}
                options={[
                  { value: "", label: "Tutti" },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: projectOptionLabel(p, companies, workspaces),
                  })),
                ]}
              />
            )}
          </div>
          <Button className="mt-4" variant="danger" size="sm" disabled={submitting} onClick={handleRevoke}>
            Conferma revoca
          </Button>
        </PremiumCard>
      )}

      <Toast message={toast ?? ""} open={!!toast} onClose={() => setToast(null)} variant={toastVariant} />
    </div>
  );
}
