import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db/client";
import { users, type User } from "../db/schema";
import type { AppEnv } from "../env";
import { httpError } from "../lib/errors";
import { signToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { loginSchema, parseWith, readJson, registerSchema } from "../lib/validation";
import { requireAuth } from "../middleware/auth";

const toUserDto = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  created_at: u.createdAt,
});

export const authRoute = new Hono<AppEnv>();

authRoute.post("/register", async (c) => {
  const input = parseWith(registerSchema, await readJson(c));
  const db = getDb(c.env.DB);

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);
  if (existing) throw httpError(409, "An account with this email already exists");

  const password = await hashPassword(input.password, c.get("config").BCRYPT_ROUNDS);

  try {
    const [created] = await db
      .insert(users)
      .values({ name: input.name, email: input.email, password })
      .returning();
    if (!created) throw new Error("User insert returned no row");
    return c.json({ user: toUserDto(created) }, 201);
  } catch (err) {
    // Race condition: another request registered the same email in between.
    if (err instanceof Error && err.message.includes("UNIQUE")) {
      throw httpError(409, "An account with this email already exists");
    }
    throw err;
  }
});

authRoute.post("/login", async (c) => {
  const input = parseWith(loginSchema, await readJson(c));
  const db = getDb(c.env.DB);

  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  const valid = user ? await verifyPassword(input.password, user.password) : false;
  if (!user || !valid) throw httpError(401, "Invalid email or password");

  const token = await signToken(user.id, c.get("config").JWT_SECRET);
  return c.json({ token, user: toUserDto(user) });
});

authRoute.get("/me", requireAuth, async (c) => {
  const db = getDb(c.env.DB);
  const [user] = await db.select().from(users).where(eq(users.id, c.get("userId"))).limit(1);
  if (!user) throw httpError(401, "User no longer exists");
  return c.json({ user: toUserDto(user) });
});
