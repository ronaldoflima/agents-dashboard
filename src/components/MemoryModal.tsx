"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Memory, MemoryType, Project } from "@/types";
import { getTemplate } from "@/lib/templates";

interface Props {
  memory: Memory | null;
  projects: Project[];
  defaultProjectSlug: string | null;
  onSave: (data: {
    id?: string;
    projectSlug: string;
    name: string;
    description: string;
    type: MemoryType;
    body: string;
  }) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const inputStyle = {
  background: "#111",
  border: "1px solid #2a2a2a",
  color: "#e5e5e5",
};

const labelStyle = { color: "#888", fontSize: "0.75rem", fontWeight: 500, marginBottom: "6px", display: "block" };

export default function MemoryModal({ memory, projects, defaultProjectSlug, onSave, onDelete, onClose }: Props) {
  const isEditing = !!memory;
  const [name, setName] = useState(memory?.name ?? "");
  const [description, setDescription] = useState(memory?.description ?? "");
  const [type, setType] = useState<MemoryType>(memory?.type ?? "feedback");
  const [body, setBody] = useState(memory?.body ?? getTemplate("feedback"));
  const [projectSlug, setProjectSlug] = useState(
    memory?.projectSlug ?? defaultProjectSlug ?? projects[0]?.slug ?? ""
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isEditing && !memory) {
      setBody(getTemplate(type));
    }
  }, [type, isEditing, memory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: memory?.id, projectSlug, name, description, type, body });
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        style={{ background: "#141414", border: "1px solid #222" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #1e1e1e" }}
        >
          <h2 className="text-base font-semibold" style={{ color: "#e5e5e5" }}>
            {isEditing ? "Editar Memória" : "Nova Memória"}
          </h2>
          <button
            onClick={onClose}
            className="text-xl leading-none"
            style={{ color: "#555" }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MemoryType)}
                  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                >
                  <option value="feedback">feedback</option>
                  <option value="project">project</option>
                  <option value="user">user</option>
                  <option value="reference">reference</option>
                </select>
              </div>
              {!isEditing && (
                <div>
                  <label style={labelStyle}>Project</label>
                  <select
                    value={projectSlug}
                    onChange={(e) => setProjectSlug(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={inputStyle}
                  >
                    {projects.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label style={labelStyle}>Body</label>
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-[220px]">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full h-full rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none"
                style={inputStyle}
              />
              <div
                className="rounded-lg px-4 py-3 overflow-y-auto text-sm prose prose-sm prose-invert max-w-none"
                style={{ background: "#111", border: "1px solid #2a2a2a" }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
              </div>
            </div>
          </div>

          <div
            className="flex items-center justify-between pt-4 mt-auto"
            style={{ borderTop: "1px solid #1e1e1e" }}
          >
            <div>
              {isEditing && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "#f87171" }}>Confirmar exclusão?</span>
                    <button
                      type="button"
                      onClick={() => onDelete(memory!.id)}
                      className="px-3 py-1.5 text-sm rounded-lg"
                      style={{ background: "#7f1d1d", color: "#fca5a5" }}
                    >
                      Sim, deletar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 text-sm rounded-lg"
                      style={{ background: "#1e1e1e", color: "#888" }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 text-sm rounded-lg"
                    style={{ color: "#f87171", background: "transparent" }}
                  >
                    Deletar
                  </button>
                )
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg"
                style={{ background: "#1e1e1e", color: "#888" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded-lg font-medium"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
