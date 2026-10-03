import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { configSchema, type AppEnv } from "./env";
import { ValidationError } from "./lib/errors";
import { authRoute } from "./routes/auth";
import { tasksRoute } from "./routes/tasks";

const app = new Hono<AppEnv>();

// 1) Validate environment variables with Zod
app.use("*", async (c, next) => {
  const parsed = configSchema.safeParse(c.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
    return c.json({ error: "Server is misconfigured" }, 500);
  }
  c.set("config", parsed.data);
  await next();
});

// 2) CORS (frontend lives on a different origin)
app.use("*", async (c, next) => {
  const allowed = c
    .get("config")
    .CORS_ORIGIN.split(",")
    .map((o) => o.trim());
  return cors({
    origin: (origin) => (allowed.includes("*") ? "*" : allowed.includes(origin) ? origin : null),
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  })(c, next);
});

app.get("/", (c) => c.json({ name: "BigLyp Task Manager API", status: "ok" }));
app.route("/api/auth", authRoute);
app.route("/api/tasks", tasksRoute);

app.notFound((c) => c.json({ error: "Route not found" }, 404));

app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.summary, details: err.issues }, 400);
  }
  if (err instanceof HTTPException) return err.getResponse();
  console.error("Unhandled error", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
