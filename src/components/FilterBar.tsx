import { MemoryType } from "@/types";

const TYPES: (MemoryType | "all")[] = ["all", "user", "feedback", "project", "reference"];

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: MemoryType | "all";
  onTypeChange: (value: MemoryType | "all") => void;
}

export default function FilterBar({ search, onSearchChange, typeFilter, onTypeChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="text"
        placeholder="Buscar memórias..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
        style={{
          background: "#161616",
          border: "1px solid #222",
          color: "#e5e5e5",
        }}
      />
      <div className="flex gap-1">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all"
            style={
              typeFilter === t
                ? { background: "#e5e5e5", color: "#0d0d0d" }
                : { background: "#161616", color: "#666", border: "1px solid #222" }
            }
          >
            {t === "all" ? "Todos" : t}
          </button>
        ))}
      </div>
    </div>
  );
}
