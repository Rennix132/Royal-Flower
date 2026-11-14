import { cookies } from "next/headers";
import { authClient, db } from "./supabase";

export const ACCESS = "rf_access";
export const REFRESH = "rf_refresh";

export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/admin",
};

export type Staff = { email: string; role: "owner" | "staff" };

async function staffByToken(token: string): Promise<Staff | null> {
  const { data, error } = await authClient().auth.getUser(token);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) return null;

  const { data: row } = await db()
    .from("staff")
    .select("email, role")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();
  return row ? (row as Staff) : null;
}

export async function saveSession(session: { access_token: string; refresh_token: string }) {
  const store = await cookies();
  store.set(ACCESS, session.access_token, { ...COOKIE_OPTS, maxAge: 60 * 60 });
  store.set(REFRESH, session.refresh_token, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 14 });
}

export async function getStaff(): Promise<Staff | null> {
  const store = await cookies();
  const access = store.get(ACCESS)?.value;
  if (access) {
    const staff = await staffByToken(access);
    if (staff) return staff;
  }
  const refresh = store.get(REFRESH)?.value;
  if (!refresh) return null;

  const { data, error } = await authClient().auth.refreshSession({ refresh_token: refresh });
  if (error || !data.session) return null;
  await saveSession(data.session);
  return staffByToken(data.session.access_token);
}

type Guard = { staff: Staff; error?: undefined } | { error: Response; staff?: undefined };

// Проверка доступа. ownerOnly = true — только владелец.
export async function requireStaff(ownerOnly = false): Promise<Guard> {
  const staff = await getStaff();
  if (!staff) return { error: Response.json({ error: "Нужно войти" }, { status: 401 }) };
  if (ownerOnly && staff.role !== "owner") {
    return { error: Response.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  return { staff };
}