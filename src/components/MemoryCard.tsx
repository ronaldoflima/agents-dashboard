import { Memory } from "@/types";

const TYPE_STYLES: Record<string, { bg: string; color: string }> = {
  feedback: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24" },
  project:  { bg: "rgba(96,165,250,0.1)",  color: "#60a5fa" },
  user:     { bg: "rgba(52,211,153,0.1)",  color: "#34d399" },
  reference:{ bg: "rgba(148,163,184,0.1)", color: "#94a3b8" },
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function shortProject(slug: string): string {
  const parts = slug.split("-");
  return parts[parts.length - 1] || slug;
}

interface Props {
  memory: Memory;
  onClick: (memory: Memory) => void;
}

export default function MemoryCard({ memory, onClick }: Props) {
  const typeStyle = TYPE_STYLES[memory.type] ?? TYPE_STYLES.reference;

  return (
    <button
      onClick={() => onClick(memory)}
      className="w-full text-left rounded-xl p-4 transition-all cursor-pointer"
      style={{
        background: "#161616",
        border: "1px solid #222",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#333";
        (e.currentTarget as HTMLElement).style.background = "#1a1a1a";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "#222";
        (e.currentTarget as HTMLElement).style.background = "#161616";
      }}
    >
      <span
        className="inline-block text-xs font-medium px-2 py-0.5 rounded-md"
        style={{ background: typeStyle.bg, color: typeStyle.color }}
      >
        {memory.type}
      </span>

      <h3 className="mt-2.5 font-medium text-sm leading-snug line-clamp-2" style={{ color: "#e5e5e5" }}>
        {memory.name}
      </h3>

      <p className="mt-1 text-xs line-clamp-2 leading-relaxed" style={{ color: "#666" }}>
        {memory.description}
      </p>

      <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "#444" }}>
        <span className="truncate max-w-[70%]">{shortProject(memory.projectSlug ?? memory.projectName)}</span>
        <span>{timeAgo(memory.lastModified)}</span>
      </div>
    </button>
  );
}
