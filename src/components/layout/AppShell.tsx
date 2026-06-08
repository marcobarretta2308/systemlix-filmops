"use client";

import { ProjectSessionManager } from "./ProjectSessionManager";
import { ProjectStatusBanner } from "./ProjectStatusBanner";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <ProjectSessionManager />
      <Sidebar />
      <div
        className="flex min-h-screen min-w-0 flex-col"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <TopBar />
        <main className="flex-1 w-full min-w-0 px-[var(--page-padding)] py-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[1440px]">
            <ProjectStatusBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
