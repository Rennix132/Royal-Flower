import { saveSession } from "@/lib/auth";
import { authClient, db } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return Response.json({ error: "Введите почту и пароль" }, { status: 400 });
  }

  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return Response.json({ error: "Неверная почта или пароль" }, { status: 401 });
  }

  const { data: staff } = await db()
    .from("staff")
    .select("email, role")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();
  if (!staff) return Response.json({ error: "У вас нет доступа" }, { status: 403 });

  await saveSession(data.session);
  return Response.json({ email: staff.email, role: staff.role });
}