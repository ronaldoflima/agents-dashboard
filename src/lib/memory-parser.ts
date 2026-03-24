import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import matter from "gray-matter";
import { Memory, MemoryType } from "@/types";
import { extractProjectName } from "./project-scanner";

export function generateId(filePath: string): string {
  return crypto.createHash("sha256").update(filePath).digest("hex").slice(0, 16);
}

export function toSnakeCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function generateFileName(type: MemoryType, name: string): string {
  return `${type}_${toSnakeCase(name)}.md`;
}

export async function parseMemoryFile(
  filePath: string,
  projectSlug: string
): Promise<Memory | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const { data, content: body } = matter(content);
    const stat = await fs.stat(filePath);

    return {
      id: generateId(filePath),
      fileName: path.basename(filePath),
      projectSlug,
      projectName: extractProjectName(projectSlug),
      name: data.name || path.basename(filePath, ".md"),
      description: data.description || "",
      type: data.type || "reference",
      body: body.trim(),
      lastModified: stat.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function listMemories(memoryDir: string, projectSlug: string): Promise<Memory[]> {
  const entries = await fs.readdir(memoryDir, { withFileTypes: true });
  const memories: Memory[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === "MEMORY.md") continue;
    if (!entry.name.endsWith(".md")) continue;

    const memory = await parseMemoryFile(
      path.join(memoryDir, entry.name),
      projectSlug
    );
    if (memory) memories.push(memory);
  }

  return memories;
}

export function serializeMemory(
  name: string,
  description: string,
  type: MemoryType,
  body: string
): string {
  const frontmatter = matter.stringify(body ? `\n${body}\n` : "\n", {
    name,
    description,
    type,
  });
  return frontmatter;
}

export async function writeMemoryFile(
  filePath: string,
  name: string,
  description: string,
  type: MemoryType,
  body: string
): Promise<void> {
  const content = serializeMemory(name, description, type, body);
  await fs.writeFile(filePath, content, "utf-8");
}

export async function createBackup(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  const backupDir = path.join(dir, ".backups");
  await fs.mkdir(backupDir, { recursive: true });

  const backupPath = path.join(backupDir, `${path.basename(filePath)}.bak`);
  await fs.copyFile(filePath, backupPath);
}

export async function findMemoryById(
  memoryDir: string,
  projectSlug: string,
  id: string
): Promise<{ memory: Memory; filePath: string } | null> {
  const entries = await fs.readdir(memoryDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || entry.name === "MEMORY.md" || !entry.name.endsWith(".md")) continue;
    const filePath = path.join(memoryDir, entry.name);
    if (generateId(filePath) === id) {
      const memory = await parseMemoryFile(filePath, projectSlug);
      if (memory) return { memory, filePath };
    }
  }
  return null;
}
