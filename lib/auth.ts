import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const COOKIE_NAME = "dge_admin_session";
export type AppRole = "ADMIN" | "LICENSE_OPERATOR" | "ATTENDANCE_OPERATOR" | "CUSTOM";
export type AppPermission = "DASHBOARD" | "PERSONNEL" | "LEGAJOS" | "LICENSES" | "ATTENDANCE";

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
    if (typeof payload.email !== "string") return null;
    const role = String(payload.role || "") as AppRole;
    if (!(["ADMIN","LICENSE_OPERATOR","ATTENDANCE_OPERATOR","CUSTOM"] as string[]).includes(role)) return null;
    const userId = typeof payload.userId === "number" ? payload.userId : null;

    // Cuenta de contingencia definida en Vercel: administrador general sin restricción de oficina.
    if (role === "ADMIN" && userId === null) {
      return { email:payload.email, role, userId:null, permissions:["DASHBOARD","PERSONNEL","LEGAJOS","LICENSES","ATTENDANCE"] as AppPermission[], mustChangePassword:false, officeId:null as number|null, officeName:null as string|null, generalAdmin:true };
    }

    if (userId !== null) {
      const sql=db();
      const user=(await sql`SELECT u.id,u.email,u.role,u.active,u.must_change_password,u.office_id,u.is_general_admin,o.name AS office_name FROM app_users u LEFT JOIN offices o ON o.id=u.office_id WHERE u.id=${userId} LIMIT 1`)[0];
      if(!user || !user.active) return null;
      const permissions=(await sql`SELECT p.code FROM app_user_permissions up JOIN app_permissions p ON p.code=up.permission_code WHERE up.user_id=${userId} AND p.active=TRUE ORDER BY p.code`).map((r:any)=>String(r.code)) as AppPermission[];
      return { email:String(user.email), role:String(user.role) as AppRole, userId:Number(user.id), permissions, mustChangePassword:Boolean(user.must_change_password), officeId:user.office_id==null?null:Number(user.office_id), officeName:user.office_name?String(user.office_name):null, generalAdmin:Boolean(user.is_general_admin) };
    }
    return null;
  } catch { return null; }
}

type Session = Awaited<ReturnType<typeof getAdminSession>>;
type NonNullSession = NonNullable<Session>;
export function isGeneralAdmin(session: Session): boolean { return Boolean(session?.generalAdmin); }
// Compatibilidad: donde históricamente se pedía ADMIN, ahora significa administrador general.
export function isAdmin(session: Session): boolean { return isGeneralAdmin(session); }
export function hasPermission(session: Session, permission: AppPermission): boolean {
  return Boolean(session && (session.generalAdmin || session.permissions?.includes(permission)));
}
export function canManageLicenses(session: Session): boolean { return hasPermission(session,"LICENSES"); }
export function canManageAttendance(session: Session): boolean { return hasPermission(session,"ATTENDANCE"); }
export function canManagePersonnel(session: Session): boolean { return hasPermission(session,"PERSONNEL"); }
export function canViewDashboard(session: Session): boolean { return hasPermission(session,"DASHBOARD"); }
export function canViewLegajos(session: Session): boolean { return hasPermission(session,"LEGAJOS"); }

export async function authenticateUser(email: string, password: string): Promise<{email:string;role:AppRole;userId:number|null;permissions:AppPermission[];mustChangePassword:boolean;officeId:number|null;generalAdmin:boolean}|null> {
  const normalized=email.trim().toLowerCase();
  const expectedEmail=process.env.ADMIN_EMAIL?.trim().toLowerCase(); const expectedPassword=process.env.ADMIN_PASSWORD;
  if (expectedEmail && expectedPassword && normalized === expectedEmail && password === expectedPassword) return {email:expectedEmail,role:"ADMIN",userId:null,permissions:["DASHBOARD","PERSONNEL","LEGAJOS","LICENSES","ATTENDANCE"],mustChangePassword:false,officeId:null,generalAdmin:true};
  try {
    const sql=db();
    const row=(await sql`SELECT id,email,password_hash,role,active,must_change_password,office_id,is_general_admin FROM app_users WHERE lower(email)=lower(${normalized}) LIMIT 1`)[0];
    if(!row || !row.active || !(["ADMIN","LICENSE_OPERATOR","ATTENDANCE_OPERATOR","CUSTOM"] as string[]).includes(String(row.role))) return null;
    if(!(await bcrypt.compare(password,String(row.password_hash)))) return null;
    await sql`UPDATE app_users SET last_login_at=now(),updated_at=now() WHERE id=${Number(row.id)}`;
    const permissions=(await sql`SELECT p.code FROM app_user_permissions up JOIN app_permissions p ON p.code=up.permission_code WHERE up.user_id=${Number(row.id)} AND p.active=TRUE ORDER BY p.code`).map((r:any)=>String(r.code)) as AppPermission[];
    return {email:String(row.email),role:row.role as AppRole,userId:Number(row.id),permissions,mustChangePassword:Boolean(row.must_change_password),officeId:row.office_id==null?null:Number(row.office_id),generalAdmin:Boolean(row.is_general_admin)};
  } catch { return null; }
}

export async function pinLookup(pin: string) {
  const crypto = await import("node:crypto"); const secret = process.env.AUTH_SECRET || "";
  return crypto.createHmac("sha256", secret).update(`employee-pin:${pin}`).digest("hex");
}
