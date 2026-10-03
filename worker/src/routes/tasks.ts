import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db/client";
import { tasks, type Task } from "../db/schema";
import type { AppEnv } from "../env";
import { httpError } from "../lib/errors";
import {
  createTaskSchema,
  idParamSchema,
  listQuerySchema,
  parseWith,
  readJson,
  updateTaskSchema,
} from "../lib/validation";
import { requireAuth } from "../middleware/auth";

const toTaskDto = (t: Task) => ({
  id: t.id,
  user_id: t.userId,
  title: t.title,
  description: t.description,
  status: t.status,
  due_date: t.dueDate,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

export const tasksRoute = new Hono<AppEnv>();

// Every task endpoint requires a valid JWT.
tasksRoute.use("*", requireAuth);

// Ownership is enforced by ALWAYS filtering on user_id = JWT sub.
// Another user's task is indistinguishable from a missing one -> 404.

tasksRoute.get("/", async (c) => {
  const { status } = parseWith(listQuerySchema, c.req.query());
  const userId = c.get("userId");
  const db = getDb(c.env.DB);

  const rows = await db
    .select()
    .from(tasks)
    .where(status ? and(eq(tasks.userId, userId), eq(tasks.status, status)) : eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt));

  return c.json({ tasks: rows.map(toTaskDto) });
});

tasksRoute.post("/", async (c) => {
  const body = parseWith(createTaskSchema, await readJson(c));
  const db = getDb(c.env.DB);

  const [created] = await db
    .insert(tasks)
    .values({
      userId: c.get("userId"),
      title: body.title,
      description: body.description ?? null,
      status: body.status,
      dueDate: body.due_date ?? null,
    })
    .returning();
  if (!created) throw new Error("Task insert returned no row");

  return c.json({ task: toTaskDto(created) }, 201);
});

tasksRoute.get("/:id", async (c) => {
  const { id } = parseWith(idParamSchema, c.req.param());
  const db = getDb(c.env.DB);

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, c.get("userId"))))
    .limit(1);
  if (!task) throw httpError(404, "Task not found");

  return c.json({ task: toTaskDto(task) });
});

tasksRoute.patch("/:id", async (c) => {
  const { id } = parseWith(idParamSchema, c.req.param());
  const body = parseWith(updateTaskSchema, await readJson(c));
  const db = getDb(c.env.DB);

  const [updated] = await db
    .update(tasks)
    .set({
      title: body.title,
      description: body.description,
      status: body.status,
      dueDate: body.due_date,
      updatedAt: nowSeconds(),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, c.get("userId"))))
    .returning();
  if (!updated) throw httpError(404, "Task not found");

  return c.json({ task: toTaskDto(updated) });
});

tasksRoute.delete("/:id", async (c) => {
  const { id } = parseWith(idParamSchema, c.req.param());
  const db = getDb(c.env.DB);

  const [deleted] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, c.get("userId"))))
    .returning({ id: tasks.id });
  if (!deleted) throw httpError(404, "Task not found");

  return c.body(null, 204);
});
