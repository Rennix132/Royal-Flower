import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/supabase";

export async function GET(request: Request) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 100);

  let query = db()
    .from("clients")
    .select("id, full_name, phone, card_number, balance, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    const text = q.replace(/[,()%*\\"]/g, " ").trim();
    let digits = q.replace(/\D/g, "");
    if (digits.startsWith("8")) digits = "7" + digits.slice(1);

    const conditions: string[] = [];
    if (text) conditions.push(`full_name.ilike.%${text}%`, `card_number.ilike.%${text}%`);
    if (digits.length >= 3) conditions.push(`phone.ilike.%${digits}%`);
    if (conditions.length > 0) query = query.or(conditions.join(","));
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return Response.json({ error: "Ошибка базы данных" }, { status: 500 });
  }
  return Response.json({ clients: data });
}