import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../env";
import { verifyToken } from "../lib/jwt";

/** Validates the Bearer JWT on every request and exposes the user id. */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }
  try {
    const userId = await verifyToken(token, c.get("config").JWT_SECRET);
    c.set("userId", userId);
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
  await next();
});
