import { cookies } from "next/headers";
import { ACCESS, COOKIE_OPTS, REFRESH } from "@/lib/auth";

export async function POST() {
  const store = await cookies();
  store.set(ACCESS, "", { ...COOKIE_OPTS, maxAge: 0 });
  store.set(REFRESH, "", { ...COOKIE_OPTS, maxAge: 0 });
  return Response.json({ ok: true });
}