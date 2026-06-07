interface SectionTitleProps {
  title: string;
  description?: string;
}

export function SectionTitle({ title, description }: SectionTitleProps) {
  return (
    <div className="mb-5">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-[13px] text-[var(--text-muted)] opacity-80">{description}</p>
      )}
    </div>
  );
}
