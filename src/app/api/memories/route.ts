import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { scanProjects } from "@/lib/project-scanner";
import {
  listMemories,
  generateFileName,
  writeMemoryFile,
  parseMemoryFile,
} from "@/lib/memory-parser";
import { reconcileIndex } from "@/lib/memory-index";
import { Memory, MemoryType, CreateMemoryRequest } from "@/types";

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
