import { z } from "zod";

/** Raw bindings injected by the Workers runtime. */
export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGIN?: string;
  BCRYPT_ROUNDS?: string;
};

/** Env vars are validated with Zod on every request (cheap) before use. */
export const configSchema = z.object({
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  CORS_ORIGIN: z.string().default("*"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(10),
});

export type Config = z.infer<typeof configSchema>;

export type AppEnv = {
  Bindings: Bindings;
  Variables: { config: Config; userId: string };
};
