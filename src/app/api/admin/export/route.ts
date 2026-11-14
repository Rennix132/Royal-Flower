import ExcelJS from "exceljs";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/supabase";

type Row = Record<string, unknown>;

const TZ = "Asia/Almaty"; // поменяйте, если нужен другой часовой пояс

const fmt = (iso: unknown) => new Date(String(iso)).toLocaleString("ru-RU", { timeZone: TZ });
const fmtDay = (day: unknown) => String(day).split("-").reverse().join(".");
const byCreated = (a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at));

// Supabase отдаёт максимум 1000 строк за раз, поэтому читаем по страницам
async function fetchAll(table: string, columns: string): Promise<Row[]> {
  const supabase = db();
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as unknown as Row[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

export async function GET(request: Request) {
  const guard = await requireStaff(true); // только владелец
  if (guard.error) return guard.error;

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const kind = url.searchParams.get("kind") === "history" ? "history" : "clients";

  const [clients, dates, txs] = await Promise.all([
    fetchAll("clients", "id, full_name, phone, card_number, balance, created_at"),
    fetchAll("important_dates", "client_id, person, relation, event_date"),
    fetchAll("loyalty_transactions", "client_id, points, comment, created_by, created_at"),
  ]);
  clients.sort(byCreated);
  txs.sort(byCreated);

  const clientById = new Map(clients.map((c) => [String(c.id), c]));
  const datesOf = new Map<string, string[]>();
  for (const d of dates) {
    const key = String(d.client_id);
    const list = datesOf.get(key) ?? [];
    list.push(`${d.person} (${d.relation}): ${fmtDay(d.event_date)}`);
    datesOf.set(key, list);
  }

  const clientHead = ["Имя", "WhatsApp", "Номер карты", "Дата создания карты", "Баллы", "Важные даты"];
  const clientRows = clients.map((c) => [
    c.full_name, c.phone, c.card_number, fmt(c.created_at), c.balance,
    (datesOf.get(String(c.id)) ?? []).join("; "),
  ]);

  const historyHead = ["Дата", "Клиент", "Номер карты", "Операция", "Баллы", "Комментарий", "Кто провёл"];
  const historyRows = txs.map((t) => {
    const c = clientById.get(String(t.client_id));
    const points = Number(t.points);
    return [
      fmt(t.created_at), c?.full_name ?? "", c?.card_number ?? "",
      points > 0 ? "Начисление" : "Списание", Math.abs(points),
      t.comment ?? "", t.created_by ?? "",
    ];
  });

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const addSheet = (name: string, head: string[], rows: unknown[][]) => {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = head.map((header) => ({ header, width: 24 }));
      sheet.getRow(1).font = { bold: true };
      rows.forEach((row) => sheet.addRow(row));
    };
    addSheet("Клиенты", clientHead, clientRows);
    addSheet("История баллов", historyHead, historyRows);

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(new Uint8Array(buffer as unknown as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="royal-flowers-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // CSV: разделитель «;» и BOM, чтобы Excel правильно открыл русский текст
  const quote = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  // защита от «формул» в ячейках, которые могли ввести клиенты
  const text = (v: unknown) => {
    const s = String(v ?? "");
    return quote(/^[=+\-@\t\r]/.test(s) ? "'" + s : s);
  };
  const head = kind === "history" ? historyHead : clientHead;
  const rows = kind === "history" ? historyRows : clientRows;
  const lines = [
    head.map(quote).join(";"),
    ...rows.map((row) =>
      row
        // телефон мы сами привели к виду +7XXXXXXXXXX, поэтому он безопасен;
        // формула ="..." нужна, чтобы Excel не превратил его в число
        .map((v, i) => (kind === "clients" && i === 1 ? quote(`="${v}"`) : text(v)))
        .join(";"),
    ),
  ];

  return new Response("\uFEFF" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="royal-flowers-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}