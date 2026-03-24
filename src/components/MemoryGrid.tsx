import { Memory } from "@/types";
import MemoryCard from "./MemoryCard";

interface Props {
  memories: Memory[];
  onCardClick: (memory: Memory) => void;
}

export default function MemoryGrid({ memories, onCardClick }: Props) {
  if (memories.length === 0) {
    return (
      <div className="text-center py-16 text-sm" style={{ color: "#555" }}>
        Nenhuma memória encontrada.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {memories.map((m) => (
        <MemoryCard key={m.id} memory={m} onClick={onCardClick} />
      ))}
    </div>
  );
}
