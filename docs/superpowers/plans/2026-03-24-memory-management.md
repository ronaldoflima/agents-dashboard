# Memory Management Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js dashboard that reads/writes Claude Code memory files from `~/.claude/projects/*/memory/`, providing a cards-based UI with full CRUD, search, and filtering.

**Architecture:** Next.js App Router with API routes that operate directly on the filesystem. No database — the `.md` files are the source of truth. Frontend uses React with Tailwind CSS, cards/grid layout, and a split markdown editor/preview modal.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, gray-matter, react-markdown, remark-gfm, react-hot-toast

**Spec:** `docs/superpowers/specs/2026-03-24-memory-management-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `tailwind.config.ts` (if needed by Tailwind v4)
- Create: `src/app/globals.css`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/ronaldo.limapx.center/pessoal/projects/agents-dashboard
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Select defaults when prompted. This creates the full scaffolding.

- [ ] **Step 2: Install additional dependencies**

Run:
```bash
npm install gray-matter react-markdown remark-gfm react-hot-toast
# Verify Tailwind v4 is installed (create-next-app may install v3)
npm ls tailwindcss | grep tailwindcss
# If v3.x, upgrade: npm install tailwindcss@^4
```

- [ ] **Step 3: Verify dev server starts**

Run: `npm run dev`
Expected: Server running on http://localhost:3000, default Next.js page renders.

- [ ] **Step 4: Initialize git repo and commit**

Run:
```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with dependencies"
```

---

### Task 2: Types & Templates

**Files:**
- Create: `src/types/index.ts`
- Create: `src/lib/templates.ts`

- [ ] **Step 1: Create shared types**

Create `src/types/index.ts`:
```typescript
export type MemoryType = "user" | "feedback" | "project" | "reference";

export interface Memory {
  id: string;
  fileName: string;
  projectSlug: string;
  projectName: string;
  name: string;
  description: string;
  type: MemoryType;
  body: string;
  lastModified: string;
}

export interface Project {
  slug: string;
  name: string;
  memoryCount: number;
  path: string;
}

export interface ApiError {
  error: "NOT_FOUND" | "CONFLICT" | "INVALID_INPUT" | "SERVER_ERROR";
  message: string;
}

export interface CreateMemoryRequest {
  projectSlug: string;
  name: string;
  description: string;
  type: MemoryType;
  body: string;
}

export interface UpdateMemoryRequest {
  name?: string;
  description?: string;
  type?: MemoryType;
  body?: string;
}
```

- [ ] **Step 2: Create templates**

Create `src/lib/templates.ts`:
```typescript
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
```

- [ ] **Step 3: Commit**

Run:
```bash
git add src/types src/lib/templates.ts
git commit -m "feat: add shared types and memory templates"
```

---

### Task 3: Project Scanner

**Files:**
- Create: `src/lib/project-scanner.ts`

This module discovers all Claude Code projects that have a `memory/` directory.

- [ ] **Step 1: Implement project scanner**

Create `src/lib/project-scanner.ts`:
```typescript
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
```

- [ ] **Step 2: Verify manually**

Run: `npx tsx -e "import { scanProjects } from './src/lib/project-scanner'; scanProjects().then(p => console.log(JSON.stringify(p, null, 2)))"`

Expected: JSON array with projects like torrepx, finance-ops-bot, etc.

- [ ] **Step 3: Commit**

Run:
```bash
git add src/lib/project-scanner.ts
git commit -m "feat: add project scanner for ~/.claude/projects"
```

---

### Task 4: Memory Parser (read/write .md files)

**Files:**
- Create: `src/lib/memory-parser.ts`

Core module that reads and writes individual memory `.md` files using `gray-matter`.

- [ ] **Step 1: Implement memory parser**

Create `src/lib/memory-parser.ts`:
```typescript
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
```

- [ ] **Step 2: Verify parser reads real files**

Run: `npx tsx -e "import { listMemories } from './src/lib/memory-parser'; import { scanProjects } from './src/lib/project-scanner'; scanProjects().then(ps => listMemories(ps[0].memoryPath, ps[0].slug)).then(m => console.log(JSON.stringify(m, null, 2)))"`

Expected: JSON array of Memory objects from the first project.

- [ ] **Step 3: Commit**

Run:
```bash
git add src/lib/memory-parser.ts
git commit -m "feat: add memory parser with gray-matter for read/write"
```

---

### Task 5: Memory Index Reconciler

**Files:**
- Create: `src/lib/memory-index.ts`

Rebuilds MEMORY.md index from actual files in the directory.

- [ ] **Step 1: Implement index reconciler**

Create `src/lib/memory-index.ts`:
```typescript
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
      const description = data.description || data.name || entry.name;
      lines.push(`- [${entry.name}](${entry.name}) — ${description}`);
    } catch {
      lines.push(`- [${entry.name}](${entry.name})`);
    }
  }

  lines.push("");
  await fs.writeFile(path.join(memoryDir, "MEMORY.md"), lines.join("\n"), "utf-8");
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/lib/memory-index.ts
git commit -m "feat: add MEMORY.md index reconciler"
```

---

### Task 6: API — GET /api/projects

**Files:**
- Create: `src/app/api/projects/route.ts`

- [ ] **Step 1: Implement projects endpoint**

Create `src/app/api/projects/route.ts`:
```typescript
import { NextResponse } from "next/server";
import { scanProjects } from "@/lib/project-scanner";
import { listMemories } from "@/lib/memory-parser";
import { Project } from "@/types";

export async function GET() {
  try {
    const scanned = await scanProjects();
    const projects: Project[] = await Promise.all(
      scanned.map(async (p) => {
        const memories = await listMemories(p.memoryPath, p.slug);
        return {
          slug: p.slug,
          name: p.name,
          memoryCount: memories.length,
          path: p.path,
        };
      })
    );

    return NextResponse.json(projects.filter((p) => p.memoryCount > 0));
  } catch (error) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(error) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test via curl**

Run: `curl -s http://localhost:3000/api/projects | jq .`

Expected: JSON array of projects with slug, name, memoryCount > 0.

- [ ] **Step 3: Commit**

Run:
```bash
git add src/app/api/projects
git commit -m "feat: add GET /api/projects endpoint"
```

---

### Task 7: API — GET /api/memories (list with filters)

**Files:**
- Create: `src/app/api/memories/route.ts`

- [ ] **Step 1: Implement memories list endpoint**

Create `src/app/api/memories/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { scanProjects } from "@/lib/project-scanner";
import { listMemories } from "@/lib/memory-parser";
import { Memory, MemoryType } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectFilter = searchParams.get("project");
    const typeFilter = searchParams.get("type") as MemoryType | null;
    const searchFilter = searchParams.get("search")?.toLowerCase();

    const scanned = await scanProjects();
    let allMemories: Memory[] = [];

    const targets = projectFilter
      ? scanned.filter((p) => p.slug === projectFilter)
      : scanned;

    for (const project of targets) {
      const memories = await listMemories(project.memoryPath, project.slug);
      allMemories.push(...memories);
    }

    if (typeFilter) {
      allMemories = allMemories.filter((m) => m.type === typeFilter);
    }

    if (searchFilter) {
      allMemories = allMemories.filter(
        (m) =>
          m.name.toLowerCase().includes(searchFilter) ||
          m.description.toLowerCase().includes(searchFilter) ||
          m.body.toLowerCase().includes(searchFilter)
      );
    }

    allMemories.sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    return NextResponse.json(allMemories);
  } catch (error) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(error) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test via curl**

Run:
```bash
curl -s "http://localhost:3000/api/memories" | jq '.[0]'
curl -s "http://localhost:3000/api/memories?type=feedback" | jq 'length'
curl -s "http://localhost:3000/api/memories?search=superset" | jq '.[].name'
```

Expected: First returns a memory object, second returns count of feedback memories, third returns matching names.

- [ ] **Step 3: Commit**

Run:
```bash
git add src/app/api/memories/route.ts
git commit -m "feat: add GET /api/memories with filters and search"
```

---

### Task 8: API — POST /api/memories (create)

**Files:**
- Modify: `src/app/api/memories/route.ts`

- [ ] **Step 1: Add POST handler to memories route**

Add to `src/app/api/memories/route.ts`:
```typescript
import {
  generateFileName,
  writeMemoryFile,
  parseMemoryFile,
  generateId,
} from "@/lib/memory-parser";
import { reconcileIndex } from "@/lib/memory-index";
import { CreateMemoryRequest } from "@/types";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body: CreateMemoryRequest = await request.json();
    const { projectSlug, name, description, type, body: memoryBody } = body;

    if (!projectSlug || !name || !description || !type) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: "Missing required fields: projectSlug, name, description, type" },
        { status: 400 }
      );
    }

    const validTypes = ["user", "feedback", "project", "reference"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "INVALID_INPUT", message: `Invalid type: ${type}` },
        { status: 400 }
      );
    }

    const scanned = await scanProjects();
    const project = scanned.find((p) => p.slug === projectSlug);
    if (!project) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Project not found: ${projectSlug}` },
        { status: 404 }
      );
    }

    const fileName = generateFileName(type, name);
    const filePath = path.join(project.memoryPath, fileName);

    try {
      await fs.access(filePath);
      return NextResponse.json(
        { error: "CONFLICT", message: `File already exists: ${fileName}` },
        { status: 409 }
      );
    } catch {
      // file doesn't exist, good
    }

    await writeMemoryFile(filePath, name, description, type, memoryBody || "");
    await reconcileIndex(project.memoryPath);

    const memory = await parseMemoryFile(filePath, projectSlug);
    return NextResponse.json(memory, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(error) },
      { status: 500 }
    );
  }
}
```

Note: consolidate imports at the top of the file. The GET handler and POST handler share the same file.

- [ ] **Step 2: Test via curl**

Run:
```bash
curl -s -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -d '{"projectSlug":"<first-project-slug>","name":"Test memory","description":"Testing creation","type":"reference","body":"Test body"}' | jq .
```

Expected: 201 with Memory object. Verify file exists on disk and MEMORY.md was updated.

- [ ] **Step 3: Clean up test data**

Remove the test file created above manually, then commit.

- [ ] **Step 4: Commit**

Run:
```bash
git add src/app/api/memories/route.ts
git commit -m "feat: add POST /api/memories for creating memories"
```

---

### Task 9: API — GET/PUT/DELETE /api/memories/[id]

**Files:**
- Create: `src/app/api/memories/[id]/route.ts`

- [ ] **Step 1: Implement [id] route with all three methods**

Create `src/app/api/memories/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { scanProjects } from "@/lib/project-scanner";
import {
  findMemoryById,
  generateFileName,
  writeMemoryFile,
  parseMemoryFile,
  createBackup,
} from "@/lib/memory-parser";
import { reconcileIndex } from "@/lib/memory-index";
import { UpdateMemoryRequest } from "@/types";

async function findMemoryAcrossProjects(id: string) {
  const scanned = await scanProjects();
  for (const project of scanned) {
    const result = await findMemoryById(project.memoryPath, project.slug, id);
    if (result) return { ...result, memoryPath: project.memoryPath };
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await findMemoryAcrossProjects(id);
    if (!result) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Memory not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(result.memory);
  } catch (error) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await findMemoryAcrossProjects(id);
    if (!result) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Memory not found" },
        { status: 404 }
      );
    }

    const body: UpdateMemoryRequest = await request.json();
    const newName = body.name ?? result.memory.name;
    const newDescription = body.description ?? result.memory.description;
    const newType = body.type ?? result.memory.type;
    const newBody = body.body ?? result.memory.body;

    await createBackup(result.filePath);

    const newFileName = generateFileName(newType, newName);
    const oldFileName = path.basename(result.filePath);
    let targetPath = result.filePath;

    if (newFileName !== oldFileName) {
      targetPath = path.join(path.dirname(result.filePath), newFileName);
      try {
        await fs.access(targetPath);
        return NextResponse.json(
          { error: "CONFLICT", message: `File already exists: ${newFileName}` },
          { status: 409 }
        );
      } catch {
        // no collision
      }
      await fs.unlink(result.filePath);
    }

    await writeMemoryFile(targetPath, newName, newDescription, newType, newBody);
    await reconcileIndex(result.memoryPath);

    const updated = await parseMemoryFile(targetPath, result.memory.projectSlug);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await findMemoryAcrossProjects(id);
    if (!result) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Memory not found" },
        { status: 404 }
      );
    }

    await createBackup(result.filePath);
    await fs.unlink(result.filePath);
    await reconcileIndex(result.memoryPath);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "SERVER_ERROR", message: String(error) },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Test GET/PUT/DELETE via curl**

Run (use a real id from GET /api/memories):
```bash
# Get a memory id
ID=$(curl -s http://localhost:3000/api/memories | jq -r '.[0].id')
# GET by id
curl -s "http://localhost:3000/api/memories/$ID" | jq .name
```

Expected: Returns the memory name.

- [ ] **Step 3: Commit**

Run:
```bash
git add src/app/api/memories/\[id\]
git commit -m "feat: add GET/PUT/DELETE /api/memories/[id]"
```

---

### Task 10: Frontend — MemoryCard Component

**Files:**
- Create: `src/components/MemoryCard.tsx`

- [ ] **Step 1: Implement MemoryCard**

Create `src/components/MemoryCard.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/components/MemoryCard.tsx
git commit -m "feat: add MemoryCard component"
```

---

### Task 11: Frontend — FilterBar & ProjectTabs

**Files:**
- Create: `src/components/FilterBar.tsx`
- Create: `src/components/ProjectTabs.tsx`

- [ ] **Step 1: Implement FilterBar**

Create `src/components/FilterBar.tsx`:
```tsx
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
```

- [ ] **Step 2: Implement ProjectTabs**

Create `src/components/ProjectTabs.tsx`:
```tsx
import { Project } from "@/types";

interface Props {
  projects: Project[];
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

export default function ProjectTabs({ projects, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${
          selected === null
            ? "bg-gray-900 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Todos
      </button>
      {projects.map((p) => (
        <button
          key={p.slug}
          onClick={() => onSelect(p.slug)}
          className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors ${
            selected === p.slug
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {p.name} ({p.memoryCount})
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

Run:
```bash
git add src/components/FilterBar.tsx src/components/ProjectTabs.tsx
git commit -m "feat: add FilterBar and ProjectTabs components"
```

---

### Task 12: Frontend — MemoryModal (create/edit with split editor)

**Files:**
- Create: `src/components/MemoryModal.tsx`

- [ ] **Step 1: Implement MemoryModal**

Create `src/components/MemoryModal.tsx`:
```tsx
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

export default function MemoryModal({
  memory,
  projects,
  defaultProjectSlug,
  onSave,
  onDelete,
  onClose,
}: Props) {
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
    onSave({
      id: memory?.id,
      projectSlug,
      name,
      description,
      type,
      body,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Editar Memória" : "Nova Memória"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as MemoryType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="feedback">feedback</option>
                  <option value="project">project</option>
                  <option value="user">user</option>
                  <option value="reference">reference</option>
                </select>
              </div>
              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project
                  </label>
                  <select
                    value={projectSlug}
                    onChange={(e) => setProjectSlug(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {projects.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body
            </label>
            <div className="grid grid-cols-2 gap-4 h-64">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="rounded-lg border border-gray-200 px-3 py-2 overflow-y-auto prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {body}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div>
              {isEditing && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Confirmar exclusão?</span>
                    <button
                      type="button"
                      onClick={() => onDelete(memory!.id)}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Sim, deletar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Deletar
                  </button>
                )
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
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
```

Note: `getTemplate` is imported from `@/lib/templates`. This is a client component (`"use client"`), but `templates.ts` only contains a plain object lookup — it has no server-only code, so it can be imported in both client and server contexts.

- [ ] **Step 2: Commit**

Run:
```bash
git add src/components/MemoryModal.tsx
git commit -m "feat: add MemoryModal with split markdown editor/preview"
```

---

### Task 13: Frontend — MemoryGrid Component

**Files:**
- Create: `src/components/MemoryGrid.tsx`

- [ ] **Step 1: Implement MemoryGrid**

Create `src/components/MemoryGrid.tsx`:
```tsx
import { Memory } from "@/types";
import MemoryCard from "./MemoryCard";

interface Props {
  memories: Memory[];
  onCardClick: (memory: Memory) => void;
}

export default function MemoryGrid({ memories, onCardClick }: Props) {
  if (memories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Nenhuma memória encontrada.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {memories.map((m) => (
        <MemoryCard key={m.id} memory={m} onClick={onCardClick} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

Run:
```bash
git add src/components/MemoryGrid.tsx
git commit -m "feat: add MemoryGrid component"
```

---

### Task 14: Frontend — Main Page (wire everything together)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update globals.css**

Replace `src/app/globals.css` contents with minimal Tailwind setup:
```css
@import "tailwindcss";
```

- [ ] **Step 2: Update layout.tsx**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agents Dashboard",
  description: "Memory management for Claude Code",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Implement main page**

Replace `src/app/page.tsx`:
```tsx
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
```

- [ ] **Step 4: Test in browser**

Run: `npm run dev`
Open http://localhost:3000

Expected: Dashboard loads with memory cards from all projects. Filters, search, create, edit, delete all functional.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/app/page.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat: wire up main page with all components"
```

---

### Task 15: End-to-End Verification

- [ ] **Step 1: Verify full CRUD flow**

1. Open http://localhost:3000
2. Verify cards load from all projects with correct type badges, names, and relative times
3. Click project tabs — verify filtering works
4. Type in search — verify debounced search works
5. Click type filter buttons — verify filtering works
6. Click a card — verify modal opens with correct data, split editor shows markdown + preview
7. Edit body text — verify preview updates live
8. Click Save — verify toast appears, card updates
9. Click "+ Nova Memória" — verify modal with template for selected type
10. Create a test memory — verify it appears in grid and MEMORY.md is updated on disk
11. Open the test memory, click Delete → confirm — verify removal from grid and disk
12. Verify `.backups/` directory was created with backups

- [ ] **Step 2: Verify filesystem consistency**

Run:
```bash
# Check a MEMORY.md was properly reconciled
cat ~/.claude/projects/<any-project-slug>/memory/MEMORY.md
# Check backups dir exists after an edit/delete
ls ~/.claude/projects/<any-project-slug>/memory/.backups/
```

- [ ] **Step 3: Final commit if any fixes were needed**

Run:
```bash
git add -A
git commit -m "fix: end-to-end verification fixes"
```
