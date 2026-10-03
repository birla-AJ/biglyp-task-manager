import { z } from "zod";

/* ---------- Domain ---------- */
export const TASK_STATUSES = ["todo", "in-progress", "done"] as const;
export const taskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  "in-progress": "In Progress",
  done: "Done",
};

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  created_at: z.number(),
});
export type User = z.infer<typeof userSchema>;

export const taskSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  due_date: z.number().nullable(),
  created_at: z.number(),
  updated_at: z.number(),
});
export type Task = z.infer<typeof taskSchema>;

/* ---------- API responses ---------- */
export const authResponseSchema = z.object({ token: z.string(), user: userSchema });
export const userResponseSchema = z.object({ user: userSchema });
export const taskResponseSchema = z.object({ task: taskSchema });
export const tasksResponseSchema = z.object({ tasks: z.array(taskSchema) });
export const errorResponseSchema = z.object({ error: z.string() });

/* ---------- API inputs ---------- */
export type CreateTaskInput = {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  due_date?: number | null;
};
export type UpdateTaskInput = Partial<CreateTaskInput>;

/* ---------- Form validation ---------- */
export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().trim().max(2000, "Description is too long"),
  status: taskStatusSchema,
  dueDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Enter a valid date"),
});

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Turns a failed Zod parse into { field: firstMessage } */
export function toFieldErrors<T extends Record<string, unknown>>(error: z.ZodError<T>): FieldErrors<T> {
  const out: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) {
      out[key as keyof T] = issue.message;
    }
  }
  return out;
}
