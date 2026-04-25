import type { AccentClasses } from "./categoryAccent";

interface Props {
  total: number;
  completed: number;
  accent: AccentClasses;
}

export default function CategoryProgressDots({ total, completed, accent }: Props) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i < completed ? accent.bg : "bg-muted"}`}
        />
      ))}
    </div>
  );
}
