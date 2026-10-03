import { z } from "zod";
import {
  authResponseSchema,
  errorResponseSchema,
  taskResponseSchema,
  tasksResponseSchema,
  userResponseSchema,
  type CreateTaskInput,
  type Task,
  type TaskStatus,
  type UpdateTaskInput,
  type User,
} from "./schemas";

// Validated at build time (NEXT_PUBLIC_* values are inlined by Next.js).
const API_URL = z
  .string({ required_error: "NEXT_PUBLIC_API_URL is not set" })
  .url("NEXT_PUBLIC_API_URL must be a valid URL")
  .parse(process.env.NEXT_PUBLIC_API_URL)
  .replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = { method?: string; body?: unknown; token?: string | null };

async function request(path: string, opts: RequestOptions = {}): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError("Network error — could not reach the server. Please try again.", 0);
  }

  if (res.status === 204) return undefined;

  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = errorResponseSchema.safeParse(data);
    throw new ApiError(parsed.success ? parsed.data.error : `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  async register(input: { name: string; email: string; password: string }): Promise<User> {
    const data = await request("/api/auth/register", { method: "POST", body: input });
    return userResponseSchema.parse(data).user;
  },

  async login(input: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const data = await request("/api/auth/login", { method: "POST", body: input });
    return authResponseSchema.parse(data);
  },

  async me(token: string): Promise<User> {
    const data = await request("/api/auth/me", { token });
    return userResponseSchema.parse(data).user;
  },

  async listTasks(token: string, status?: TaskStatus): Promise<Task[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    const data = await request(`/api/tasks${query}`, { token });
    return tasksResponseSchema.parse(data).tasks;
  },

  async createTask(token: string, input: CreateTaskInput): Promise<Task> {
    const data = await request("/api/tasks", { method: "POST", body: input, token });
    return taskResponseSchema.parse(data).task;
  },

  async updateTask(token: string, id: string, input: UpdateTaskInput): Promise<Task> {
    const data = await request(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
      token,
    });
    return taskResponseSchema.parse(data).task;
  },

  async deleteTask(token: string, id: string): Promise<void> {
    await request(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE", token });
  },
};
