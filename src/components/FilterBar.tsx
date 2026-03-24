import { MemoryType } from "@/types";

const TYPES: (MemoryType | "all")[] = ["all", "user", "feedback", "project", "reference"];

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: MemoryType | "all";
  onTypeChange: (value: MemoryType | "all") => void;
}

export default function FilterBar({
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
}: Props) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="text"
        placeholder="Buscar memórias..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div className="flex gap-1">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onTypeChange(t)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
              typeFilter === t
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "all" ? "Todos" : t}
          </button>
        ))}
      </div>
    </div>
  );
}
