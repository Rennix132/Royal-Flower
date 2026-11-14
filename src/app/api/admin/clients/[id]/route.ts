import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { isUuid, parseClient } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

const fail = (message: string, status: number) => Response.json({ error: message }, { status });

export async function GET(_request: Request, { params }: Ctx) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Клиент не найден", 404);

  const supabase = db();
  const [client, dates, transactions] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("important_dates")
      .select("person, relation, event_date")
      .eq("client_id", id)
      .order("event_date"),
    supabase
      .from("loyalty_transactions")
      .select("id, points, comment, created_by, created_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (client.error || dates.error || transactions.error) return fail("Ошибка базы данных", 500);
  if (!client.data) return fail("Клиент не найден", 404);

  return Response.json({
    client: client.data,
    dates: dates.data,
    transactions: transactions.data,
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Клиент не найден", 404);

  const parsed = parseClient(await request.json().catch(() => null));
  if ("error" in parsed) return fail(parsed.error, 400);

  const supabase = db();
  const { data, error } = await supabase
    .from("clients")
    .update({ full_name: parsed.name, phone: parsed.phone })
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.code === "23505") return fail("Этот номер уже записан на другого клиента", 409);
    console.error(error);
    return fail("Ошибка базы данных", 500);
  }
  if (!data || data.length === 0) return fail("Клиент не найден", 404);

  const { error: datesError } = await supabase.rpc("replace_dates", {
    p_client_id: id,
    p_dates: parsed.dates,
  });
  if (datesError) {
    console.error(datesError);
    return fail("Не удалось сохранить даты", 500);
  }
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const guard = await requireStaff(true); // только владелец
  if (guard.error) return guard.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Клиент не найден", 404);

  const { error } = await db().from("clients").delete().eq("id", id);
  if (error) {
    console.error(error);
    return fail("Ошибка базы данных", 500);
  }
  return Response.json({ ok: true });
}