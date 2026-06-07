interface UserAvatarProps {
  name: string;
  size?: "sm" | "md";
}

export function UserAvatar({ name, size = "md" }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sizes = {
    sm: "h-6 w-6 text-[9px]",
    md: "h-7 w-7 text-[10px]",
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-surface-2)] font-medium text-[var(--text-secondary)] shrink-0 ${sizes[size]}`}
    >
      {initials}
    </div>
  );
}
