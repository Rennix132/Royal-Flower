import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/supabase";

const TZ = "Asia/Almaty";
const LOOK_AHEAD_DAYS = 2;

type Row = {
  person: string;
  relation: string;
  event_date: string;
  clients: { id: string; full_name: string; phone: string } | null;
};

function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

// Через сколько дней ближайшая годовщина даты (29 февраля в невисокосный год = 28 февраля)
function daysUntil(eventDate: string, todayStr: string): number | null {
  const [, month, day] = eventDate.split("-").map(Number);
  const [ty, tm, td] = todayStr.split("-").map(Number);
  if (!month || !day || !ty || !tm || !td) return null;
  const todayMs = Date.UTC(ty, tm - 1, td);
  for (const year of [ty, ty + 1]) {
    const d = month === 2 && day === 29 && !isLeap(year) ? 28 : day;
    const days = Math.round((Date.UTC(year, month - 1, d) - todayMs) / 86_400_000);
    if (days >= 0) return days;
  }
  return null;
}

function whenText(days: number): string {
  if (days === 0) return "сегодня";
  if (days === 1) return "завтра";
  return `через ${days} дня`;
}

export async function GET() {
  const guard = await requireStaff();
  if (guard.error) return guard.error;

  const supabase = db();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("important_dates")
      .select("person, relation, event_date, clients!inner(id, full_name, phone)")
      .order("id")
      .range(from, from + 999);
    if (error) {
      console.error(error);
      return Response.json({ error: "Ошибка базы данных" }, { status: 500 });
    }
    const page = (data ?? []) as unknown as Row[];
    rows.push(...page);
    if (page.length < 1000) break;
  }

  const todayStr = today();
  const items = rows
    .flatMap((row) => {
      const days = row.clients ? daysUntil(row.event_date, todayStr) : null;
      if (days === null || days > LOOK_AHEAD_DAYS || !row.clients) return [];
      const [, month, day] = row.event_date.split("-");
      return [
        {
          clientId: row.clients.id,
          clientName: row.clients.full_name,
          phone: row.clients.phone,
          person: row.person,
          relation: row.relation,
          date: `${day}.${month}`,
          days,
          when: whenText(days),
        },
      ];
    })
    .sort((a, b) => a.days - b.days);

  return Response.json({ items });
}