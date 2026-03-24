import { Memory } from "@/types";

const TYPE_COLORS: Record<string, string> = {
  feedback: "bg-amber-100 text-amber-800",
  project: "bg-blue-100 text-blue-800",
  user: "bg-green-100 text-green-800",
  reference: "bg-gray-100 text-gray-700",
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface Props {
  memory: Memory;
  onClick: (memory: Memory) => void;
}

export default function MemoryCard({ memory, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(memory)}
      className="w-full text-left rounded-lg border border-gray-200 p-4 hover:border-gray-400 hover:shadow-sm transition-all bg-white cursor-pointer"
    >
      <span
        className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[memory.type]}`}
      >
        {memory.type}
      </span>

      <h3 className="mt-2 font-medium text-gray-900 text-sm line-clamp-2">
        {memory.name}
      </h3>

      <p className="mt-1 text-xs text-gray-500 line-clamp-1">
        {memory.description}
      </p>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>{memory.projectName}</span>
        <span>{timeAgo(memory.lastModified)}</span>
      </div>
    </button>
  );
}
