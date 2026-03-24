import { Project } from "@/types";

interface Props {
  projects: Project[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export default function ProjectTabs({ projects, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${
          selected === null
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Todos
      </button>
      {projects.map((p) => (
        <button
          key={p.slug}
          onClick={() => onSelect(p.slug)}
          className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${
            selected === p.slug
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {p.name} ({p.memoryCount})
        </button>
      ))}
    </div>
  );
}
