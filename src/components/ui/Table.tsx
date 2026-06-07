import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
      <div className="overflow-x-auto">
        <table className={cn("w-full text-[13px]", className)} {...props}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function TableHead({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)]",
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-[var(--border-subtle)]", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150 hover:bg-white/[0.02]",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableTh({
  className,
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableTd({
  className,
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-4 py-2.5 text-[13px] text-[var(--text-secondary)]",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}
