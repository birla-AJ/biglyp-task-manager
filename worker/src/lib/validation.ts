import type { Context } from "hono";
import { z } from "zod";
import { TASK_STATUSES } from "../db/schema";
import { ValidationError } from "./errors";

export function parseWith<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      result.error.issues.map((i) => ({ path: i.path, message: i.message })),
    );
  }
  return result.data as z.infer<S>;
}

export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ValidationError([{ path: [], message: "Request body must be valid JSON" }]);
  }
}

/* ---------- Auth ---------- */
const emailSchema = z.string().trim().toLowerCase().email("Invalid email address");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: emailSchema,
  // bcrypt only uses the first 72 bytes
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/* ---------- Tasks ---------- */
export const taskStatusSchema = z.enum(TASK_STATUSES);
const unixTimestamp = z.number().int("Must be an integer").nonnegative("Must be a Unix timestamp");

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long").nullish(),
  status: taskStatusSchema.default("todo"),
  due_date: unixTimestamp.nullish(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").max(200, "Title is too long").optional(),
    description: z.string().trim().max(2000, "Description is too long").nullish(),
    status: taskStatusSchema.optional(),
    due_date: unixTimestamp.nullish(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "At least one field must be provided",
  });

export const listQuerySchema = z.object({ status: taskStatusSchema.optional() });
export const idParamSchema = z.object({ id: z.string().min(1).max(64) });
