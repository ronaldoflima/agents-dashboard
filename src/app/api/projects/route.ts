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
