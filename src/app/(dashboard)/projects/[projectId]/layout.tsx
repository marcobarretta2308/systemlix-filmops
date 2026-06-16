import { ProjectActivityTracker } from "@/components/activity-log/ProjectActivityTracker";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ProjectActivityTracker />
      {children}
    </>
  );
}
