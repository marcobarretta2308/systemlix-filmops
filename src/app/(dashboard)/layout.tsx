"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ProjectGuard } from "@/components/layout/ProjectGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectGuard>
      <AppShell>{children}</AppShell>
    </ProjectGuard>
  );
}
