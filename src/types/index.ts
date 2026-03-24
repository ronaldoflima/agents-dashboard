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
