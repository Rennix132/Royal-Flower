export type DateInput = { person: string; relation: string; date: string };

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

// Приводит номер к виду +7XXXXXXXXXX
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
    digits = "7" + digits.slice(1);
  } else if (digits.length === 10) {
    digits = "7" + digits;
  } else {
    return null;
  }
  return "+" + digits;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  return text.length >= 1 && text.length <= max ? text : null;
}

function validDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value + "T00:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  const year = Number(value.slice(0, 4));
  return year >= 1900 && year <= 2100 ? value : null;
}

export function parseClient(
  input: unknown,
): { name: string; phone: string; dates: DateInput[] } | { error: string } {
  const body = (input ?? {}) as Record<string, unknown>;
  const name = cleanText(body.name, 100);
  if (!name) return { error: "Укажите имя" };

  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : null;
  if (!phone) return { error: "Проверьте номер WhatsApp" };

  const rawDates = Array.isArray(body.dates) ? body.dates : [];
  if (rawDates.length > 20) return { error: "Слишком много дат (максимум 20)" };

  const dates: DateInput[] = [];
  for (const item of rawDates) {
    const row = (item ?? {}) as Record<string, unknown>;
    const person = cleanText(row.person, 100);
    const relation = cleanText(row.relation, 60);
    const date = validDate(row.date);
    if (!person || !relation || !date) return { error: "Проверьте важные даты" };
    dates.push({ person, relation, date });
  }
  return { name, phone, dates };
}