import fs from "fs/promises";
import path from "path";
import os from "os";

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

const KNOWN_PATH_SEGMENTS = new Set([
  "users", "ronaldo", "limapx.center", "pessoal", "projects",
  "px", "private", "var", "folders", "tmp",
]);

export function extractProjectName(slug: string): string {
  const parts = slug.replace(/^-/, "").split("-");
  let lastKnownIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    if (KNOWN_PATH_SEGMENTS.has(parts[i].toLowerCase())) {
      lastKnownIndex = i;
    }
  }
  const nameParts = parts.slice(lastKnownIndex + 1);
  return nameParts.join("-") || slug;
}

export async function getProjectsDir(): Promise<string> {
  return CLAUDE_PROJECTS_DIR;
}

export async function scanProjects(): Promise<
  { slug: string; name: string; path: string; memoryPath: string }[]
> {
  const entries = await fs.readdir(CLAUDE_PROJECTS_DIR, {
    withFileTypes: true,
  });

  const projects: { slug: string; name: string; path: string; memoryPath: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const memoryPath = path.join(CLAUDE_PROJECTS_DIR, entry.name, "memory");
    try {
      const stat = await fs.stat(memoryPath);
      if (stat.isDirectory()) {
        projects.push({
          slug: entry.name,
          name: extractProjectName(entry.name),
          path: path.join(CLAUDE_PROJECTS_DIR, entry.name),
          memoryPath,
        });
      }
    } catch {
      // no memory dir, skip
    }
  }

  return projects;
}
