# FilmOps — Controllo accessi

## Modello invite-only

FilmOps è una piattaforma **invite-only / admin-controlled**.

- Nessun utente esterno può registrarsi liberamente.
- Non esiste signup pubblico nell'applicazione.
- Gli account vengono creati **solo** dal Platform Owner (FilmOps Admin).
- Le produzioni non possono creare account globali in autonomia.

## Configurazione Supabase Auth

Nel dashboard Supabase → **Authentication → Providers → Email**:

1. **Disabilitare** la registrazione pubblica (Sign ups).
2. Consentire solo **Sign in** per utenti già creati.
3. Creare utenti da **Authentication → Users → Add user** oppure via Admin API server-side.

## Creazione utenti

Gli utenti devono essere creati tramite:

- Pannello **Gestione accessi** (Platform Owner), oppure
- Route API server-side protette:
  - `POST /api/admin/users/create`
  - `POST /api/admin/users/revoke`
  - `POST /api/admin/users/ban`

Queste route verificano che il chiamante sia `profiles.global_role = platform_owner`.

## Service role key (solo server)

- Usare `SUPABASE_SERVICE_ROLE_KEY` **solo** in:
  - API routes (`app/api/admin/...`)
  - Server actions
  - Script backend
- **Mai** esporre la service role key nel browser.
- **Mai** usare `NEXT_PUBLIC_` per la service role.
- Il frontend usa solo `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Variabile server in `.env.local`:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Ruoli

| Ruolo | Ambito |
|-------|--------|
| **Platform Owner** | Tutta la piattaforma: aziende, workspace, progetti, utenti, revoche |
| **Company Admin** | Solo la propria produzione; può gestire progetti se autorizzato |
| **Project Admin** | Solo il progetto assegnato |
| **Producer** | Strumenti del progetto assegnato |
| **Assistant Director** | Scene, giornate, call sheet |
| **Department User** | Dati del proprio reparto |
| **Cast/Crew** | Informazioni operative abilitate |
| **Viewer** | Sola lettura |

## Stati accesso

### Profilo (`profiles.auth_status`)

- `active` — può accedere
- `suspended` — accesso sospeso
- `revoked` — accesso revocato
- `banned` — account disabilitato

### Membership produzione (`company_members.status`)

- `active` | `suspended` | `revoked`
- Opzionale: `access_start_date`, `access_end_date`

### Membership progetto (`project_members.access_status`)

- `active` | `suspended` | `revoked`
- Opzionale: `access_start_date`, `access_end_date`

## Fine progetto

Quando un progetto viene **archiviato** o **bloccato**:

1. `projects.status` → `archived` o `locked`
2. `project_members.access_status` → `revoked` per cast/crew e ruoli operativi non-admin
3. Editing bloccato per tutti tranne Platform Owner e Company Admin
4. Log in `project_archive_logs`: `project_archived`, `project_locked`, `access_revoked`

**Non cancellare** i dati del progetto alla chiusura: revocare gli accessi e archiviare.

## Row Level Security (RLS)

RLS separa i dati tra produzioni e progetti:

- Un utente legge solo aziende dove è `company_members` attivo
- Workspace e progetti solo della company
- Dati progetto solo con `project_members` attivo o ruolo admin company
- Policy in `supabase/rls.sql`

## Migrazione database

Su database esistenti eseguire:

```sql
-- supabase/migrations/002_access_control.sql
```

## Flusso utente senza produzione

Se un utente autenticato non ha `company_members` attivi:

- Viene reindirizzato a `/no-access`
- Deve contattare il team FilmOps per l'assegnazione
- **Non** può creare autonomamente una produzione
