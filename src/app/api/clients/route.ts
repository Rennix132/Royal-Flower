import { NextResponse } from "next/server";
import { createClient, type ImportantDateInput } from "@/lib/db";

export const runtime = "nodejs";

type Registration = {
  name: string;
  phone: string;
  consent: boolean;
  importantDates: ImportantDateInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizePhone(value: string) {
  if (!/^[\d+\s().-]+$/.test(value)) {
    return null;
  }

  let digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    digits = `7${digits}`;
  } else if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length !== 11 || !digits.startsWith("7")) {
    return null;
  }

  return `+${digits}`;
}

function validateRegistration(value: unknown):
  | { registration: Registration }
  | { error: string } {
  if (!isRecord(value)) {
    return { error: "Заполните форму и попробуйте ещё раз." };
  }

  const name = typeof value.name === "string" ? value.name.trim() : "";
  const rawPhone = typeof value.phone === "string" ? value.phone.trim() : "";
  const phone = normalizePhone(rawPhone);

  if (!name || name.length > 100) {
    return { error: "Укажите имя длиной не более 100 символов." };
  }
  if (!phone) {
    return { error: "Введите корректный номер WhatsApp с кодом +7." };
  }
  if (value.consent !== true) {
    return { error: "Для сохранения данных необходимо ваше согласие." };
  }
  if (!Array.isArray(value.importantDates)) {
    return { error: "Проверьте список важных дат." };
  }

  const importantDates: ImportantDateInput[] = [];
  for (const item of value.importantDates) {
    if (!isRecord(item)) {
      return { error: "Проверьте заполнение важных дат." };
    }

    const person = typeof item.person === "string" ? item.person.trim() : "";
    const relation = typeof item.relation === "string" ? item.relation.trim() : "";
    const date = typeof item.date === "string" ? item.date : "";

    if (!person || person.length > 100 || !relation || relation.length > 60) {
      return { error: "Заполните имя и повод для каждой важной даты." };
    }
    if (!isCalendarDate(date)) {
      return { error: "Укажите корректную дату для каждого события." };
    }

    importantDates.push({ person, relation, date });
  }

  return {
    registration: { name, phone, consent: true, importantDates },
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Не удалось прочитать данные формы. Попробуйте ещё раз." },
      { status: 400 },
    );
  }

  const validation = validateRegistration(body);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const result = createClient(
    validation.registration.name,
    validation.registration.phone,
    validation.registration.importantDates,
  );
  return NextResponse.json(result);
}
