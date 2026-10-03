import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

export async function signToken(userId: string, secret: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(encoder.encode(secret));
}

/** Returns the `sub` claim (user id) or throws if the token is invalid/expired. */
export async function verifyToken(token: string, secret: string): Promise<string> {
  const { payload } = await jwtVerify(token, encoder.encode(secret), { algorithms: ["HS256"] });
  if (!payload.sub) throw new Error("Token has no subject");
  return payload.sub;
}
