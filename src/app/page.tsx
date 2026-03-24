"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Memory, MemoryType, Project } from "@/types";
import FilterBar from "@/components/FilterBar";
import ProjectTabs from "@/components/ProjectTabs";
import MemoryGrid from "@/components/MemoryGrid";
import MemoryModal from "@/components/MemoryModal";

export default function Home() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [search, setSearch] = useState("");
  const [modalMemory, setModalMemory] = useState<Memory | null | "new">(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
  }, []);

  const fetchMemories = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedProject) params.set("project", selectedProject);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/memories?${params}`);
    const data = await res.json();
    setMemories(data);
    setLoading(false);
  }, [selectedProject, typeFilter, search]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchMemories, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchMemories, search]);

  const handleSave = async (data: {
    id?: string;
    projectSlug: string;
    name: string;
    description: string;
    type: MemoryType;
    body: string;
  }) => {
    try {
      if (data.id) {
        const res = await fetch(`/api/memories/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            type: data.type,
            body: data.body,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.message);
          return;
        }
        toast.success("Memória atualizada");
      } else {
        const res = await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.message);
          return;
        }
        toast.success("Memória criada");
      }
      setModalMemory(null);
      fetchMemories();
      fetchProjects();
    } catch {
      toast.error("Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message);
        return;
      }
      toast.success("Memória deletada");
      setModalMemory(null);
      fetchMemories();
      fetchProjects();
    } catch {
      toast.error("Erro ao deletar");
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agents Dashboard</h1>
        <button
          onClick={() => setModalMemory("new")}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          + Nova Memória
        </button>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      <ProjectTabs
        projects={projects}
        selected={selectedProject}
        onSelect={setSelectedProject}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <MemoryGrid
          memories={memories}
          onCardClick={(m) => setModalMemory(m)}
        />
      )}

      {modalMemory !== null && (
        <MemoryModal
          memory={modalMemory === "new" ? null : modalMemory}
          projects={projects}
          defaultProjectSlug={selectedProject}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalMemory(null)}
        />
      )}
    </main>
  );
}
