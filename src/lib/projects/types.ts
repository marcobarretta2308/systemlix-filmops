export interface ProjectDetailsUpdate {
  title?: string;
  production_title?: string | null;
  production_type?: string | null;
  director_name?: string | null;
  producer_name?: string | null;
  production_company?: string | null;
  description?: string | null;
  project_notes?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ProjectFilmFormState {
  title: string;
  production_title: string;
  production_type: string;
  director_name: string;
  producer_name: string;
  production_company: string;
  description: string;
  project_notes: string;
  start_date: string;
  end_date: string;
}
