import { Project } from "@/types";

function shortName(name: string): string {
  const parts = name.split("-");
  return parts[parts.length - 1] || name;
}

interface Props {
  projects: Project[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export default function ProjectTabs({ projects, selected, onSelect }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect(null)}
        className="px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-all"
        style={
          selected === null
            ? { background: "#e5e5e5", color: "#0d0d0d" }
            : { background: "#161616", color: "#666", border: "1px solid #222" }
        }
      >
        Todos
      </button>
      {projects.map((p) => (
        <button
          key={p.slug}
          onClick={() => onSelect(p.slug)}
          className="px-3 py-1.5 text-xs rounded-lg font-medium whitespace-nowrap transition-all"
          style={
            selected === p.slug
              ? { background: "#e5e5e5", color: "#0d0d0d" }
              : { background: "#161616", color: "#666", border: "1px solid #222" }
          }
          title={p.name}
        >
          {shortName(p.name)} <span style={{ color: selected === p.slug ? "#555" : "#444" }}>({p.memoryCount})</span>
        </button>
      ))}
    </div>
  );
}
