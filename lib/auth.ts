import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const COOKIE_NAME = "dge_admin_session";
export type AppRole = "ADMIN" | "LICENSE_OPERATOR";

function authKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 24) throw new Error("AUTH_SECRET debe estar configurada y ser suficientemente larga");
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(email: string, role: AppRole, userId?: number | null) {
  return new SignJWT({ email, role, userId: userId ?? null })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(authKey());
}

export async function setAdminSession(email: string, role: AppRole = "ADMIN", userId?: number | null) {
  const token = await createSessionToken(email, role, userId);
  const store = await cookies();
  store.set(COOKIE_NAME, token, { httpOnly:true, secure:process.env.NODE_ENV === "production", sameSite:"lax", path:"/", maxAge:60*60*12 });
}

export async function clearAdminSession() { const store = await cookies(); store.delete(COOKIE_NAME); }

export async function getAdminSession() {
  try {
    const store = await cookies(); const token = store.get(COOKIE_NAME)?.value; if (!token) return null;
    const { payload } = await jwtVerify(token, authKey());
    if ((payload.role !== "ADMIN" && payload.role !== "LICENSE_OPERATOR") || typeof payload.email !== "string") return null;
    return { email:payload.email, role:payload.role as AppRole, userId: typeof payload.userId === "number" ? payload.userId : null };
  } catch { return null; }
}

export function isAdmin(session: Awaited<ReturnType<typeof getAdminSession>>) { return Boolean(session && session.role === "ADMIN"); }
export function canManageLicenses(session: Awaited<ReturnType<typeof getAdminSession>>) { return Boolean(session && (session.role === "ADMIN" || session.role === "LICENSE_OPERATOR")); }

export async function authenticateUser(email: string, password: string): Promise<{email:string;role:AppRole;userId:number|null}|null> {
  const normalized=email.trim().toLowerCase();
  const expectedEmail=process.env.ADMIN_EMAIL?.trim().toLowerCase(); const expectedPassword=process.env.ADMIN_PASSWORD;
  if (expectedEmail && expectedPassword && normalized === expectedEmail && password === expectedPassword) return {email:expectedEmail,role:"ADMIN",userId:null};
  try {
    const sql=db();
    const row=(await sql`SELECT id,email,password_hash,role,active FROM app_users WHERE lower(email)=lower(${normalized}) LIMIT 1`)[0];
    if(!row || !row.active || (row.role!=="ADMIN" && row.role!=="LICENSE_OPERATOR")) return null;
    if(!(await bcrypt.compare(password,String(row.password_hash)))) return null;
    await sql`UPDATE app_users SET last_login_at=now(),updated_at=now() WHERE id=${Number(row.id)}`;
    return {email:String(row.email),role:row.role as AppRole,userId:Number(row.id)};
  } catch { return null; }
}

export async function pinLookup(pin: string) {
  const crypto = await import("node:crypto"); const secret = process.env.AUTH_SECRET || "";
  return crypto.createHmac("sha256", secret).update(`employee-pin:${pin}`).digest("hex");
}
