# FilmOps

Piattaforma SaaS **multi-tenant** per produzioni cinematografiche e audiovisive.

## Architettura

```
Utente → Company (tenant) → Workspace → Project → Tools & Data
```

Ogni dato è isolato per `company_id` e `project_id`. Gli utenti vedono solo le produzioni a cui appartengono.

### Ruoli

| Livello | Ruoli |
|---------|--------|
| Piattaforma | Platform Owner |
| Company | Company Admin, Producer, Viewer |
| Progetto | Project Admin, Producer, AD, Department User, Cast/Crew User, Viewer |

### Entità (Supabase-ready)

`users`, `companies`, `company_members`, `workspaces`, `projects`, `project_members`, `scripts`, `scenes`, `cast_crew`, `locations`, `shooting_days`, `call_sheets`, `assistant_threads`, `assistant_messages`, `project_archive_logs`

Tipi in `src/lib/types/database.ts`.

## Avvio

```bash
npm install
npm run dev
```

## Account demo

| Email | Accesso |
|-------|---------|
| `owner@filmops.it` | Tutte le produzioni |
| `admin@alfa.it` | Solo Produzione Alfa |
| `admin@beta.it` | Solo Produzione Beta |

## Flusso

1. Login → **Selettore produzione**
2. Dashboard → Workspace → Progetti
3. Apri progetto → Script Breakdown / Call Sheet / Set Assistant

## Mock data

Seed in `src/lib/mock-data/seed.ts` — dati generici, nessun cliente hardcoded nella logica.
