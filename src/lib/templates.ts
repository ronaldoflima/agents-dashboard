import { MemoryType } from "@/types";

const TEMPLATES: Record<MemoryType, string> = {
  feedback: "**Why:**\n\n**How to apply:**",
  project: "**Why:**\n\n**How to apply:**",
  user: "",
  reference: "",
};

export function getTemplate(type: MemoryType): string {
  return TEMPLATES[type];
}
