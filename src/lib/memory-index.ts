import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export async function reconcileIndex(memoryDir: string): Promise<void> {
  const entries = await fs.readdir(memoryDir, { withFileTypes: true });
  const lines: string[] = ["# Memory Index", ""];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === "MEMORY.md") continue;
    if (!entry.name.endsWith(".md")) continue;

    try {
      const content = await fs.readFile(path.join(memoryDir, entry.name), "utf-8");
      const { data } = matter(content);
      const description = data.description || "";
      lines.push(`- [${entry.name}](${entry.name}) — ${description}`);
    } catch {
      lines.push(`- [${entry.name}](${entry.name})`);
    }
  }

  lines.push("");
  await fs.writeFile(path.join(memoryDir, "MEMORY.md"), lines.join("\n"), "utf-8");
}
