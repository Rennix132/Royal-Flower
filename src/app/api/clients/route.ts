import { randomInt } from "node:crypto";
import { db } from "@/lib/supabase";
import { parseClient } from "@/lib/validate";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCardNumber() {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `RF-${s.slice(0, 4)}-${s.slice(4)}`;
}

const fail = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("Некорректный запрос", 400);

  // Скрытое поле-ловушка для ботов
  if (typeof body.website === "string" && body.website !== "") return Response.json({ ok: true });

  if (body.consent !== true) return fail("Нужно согласие на обработку данных", 400);

  const parsed = parseClient(body);
  if ("error" in parsed) return fail(parsed.error, 400);

  const supabase = db();
  let client: { id: string; card_number: string; full_name: string } | null = null;

  for (let attempt = 0; attempt < 5 && !client; attempt++) {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: parsed.name,
        phone: parsed.phone,
        card_number: newCardNumber(),
        consent_at: new Date().toISOString(),
      })
      .select("id, card_number, full_name")
      .single();

    if (!error) {
      client = data;
    } else if (error.code === "23505" && error.message.includes("clients_phone_key")) {
      return fail("Карта на этот номер уже оформлена. Если нужна помощь, обратитесь к нам в магазин.", 409);
    } else if (error.code === "23505" && error.message.includes("clients_card_number_key")) {
      continue; // случайно совпал номер карты — пробуем другой
    } else {
      console.error(error);
      return fail("Не удалось сохранить. Попробуйте позже.", 500);
    }
  }
  if (!client) return fail("Не удалось сохранить. Попробуйте позже.", 500);

  const saved = client;
  if (parsed.dates.length > 0) {
    const { error } = await supabase.from("important_dates").insert(
      parsed.dates.map((d) => ({
        client_id: saved.id,
        person: d.person,
        relation: d.relation,
        event_date: d.date,
      })),
    );
    if (error) {
      console.error(error);
      await supabase.from("clients").delete().eq("id", saved.id);
      return fail("Не удалось сохранить. Попробуйте позже.", 500);
    }
  }

  return Response.json(
    { cardNumber: saved.card_number, name: saved.full_name, dateCount: parsed.dates.length },
    { status: 201 },
  );
}