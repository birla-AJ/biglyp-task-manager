import { HTTPException } from "hono/http-exception";

export type FieldIssue = { path: (string | number)[]; message: string };

/** Thrown when a Zod validation fails -> mapped to HTTP 400 in app.onError. */
export class ValidationError extends Error {
  constructor(public readonly issues: FieldIssue[]) {
    super("Validation failed");
  }

  get summary(): string {
    return this.issues
      .map((i) => `${i.path.length > 0 ? i.path.join(".") : "body"}: ${i.message}`)
      .join("; ");
  }
}

/** HTTPException that carries a JSON body: { error: string } */
export function httpError(status: 401 | 403 | 404 | 409, message: string): HTTPException {
  return new HTTPException(status, {
    res: new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  });
}
