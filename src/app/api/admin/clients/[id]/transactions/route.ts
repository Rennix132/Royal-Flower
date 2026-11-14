import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/supabase";
import { isUuid } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

const fail = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(request: Request, { params }: Ctx) {
  const guard = await requireStaff();
  if (guard.error) return guard.error;
  const { id } = await params;
  if (!isUuid(id)) return fail("Клиент не найден", 404);

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < 1 || amount > 1_000_000) {
    return fail("Укажите целое количество баллов", 400);
  }
  if (body.type !== "accrual" && body.type !== "redemption") {
    return fail("Неверный тип операции", 400);
  }
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 300) : "";

  const { data, error } = await db().rpc("add_transaction", {
    p_client_id: id,
    p_points: body.type === "accrual" ? amount : -amount,
    p_comment: comment,
    p_staff: guard.staff.email,
  });

  if (error) {
    if (error.message.includes("insufficient_balance")) return fail("Недостаточно баллов для списания", 400);
    if (error.message.includes("client_not_found")) return fail("Клиент не найден", 404);
    console.error(error);
    return fail("Ошибка базы данных", 500);
  }
  return Response.json({ balance: data });
}