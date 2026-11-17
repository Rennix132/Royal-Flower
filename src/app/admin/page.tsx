"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./admin.css";

type Me = { email: string; role: "owner" | "staff" };
type Client = {
  id: string;
  full_name: string;
  phone: string;
  card_number: string;
  balance: number;
  created_at: string;
};
type DateRow = { person: string; relation: string; event_date: string };
type Tx = { id: string; points: number; comment: string | null; created_by: string | null; created_at: string };
type Detail = { client: Client & { consent_at: string | null }; dates: DateRow[]; transactions: Tx[] };

async function api<T = unknown>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error ?? "Ошибка"), { status: response.status });
  return data as T;
}

const when = (iso: string) => new Date(iso).toLocaleString("ru-RU");

type Reminder = {
  clientId: string;
  clientName: string;
  phone: string;
  person: string;
  relation: string;
  date: string;
  days: number;
  when: string;
};

function Bell({ onOpen, onLogout }: { onOpen: (id: string) => void; onLogout: () => void }) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: Reminder[] }>("/api/admin/reminders");
      setItems(data.items);
    } catch (err) {
      if ((err as { status?: number }).status === 401) onLogout();
    }
  }, [onLogout]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <div className="adm-bell">
      <button
        aria-label={`Уведомления: ${items.length}`}
        className="ghost adm-bell-btn"
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        type="button"
      >
        🔔
        {items.length > 0 && <span className="adm-bell-badge">{items.length}</span>}
      </button>

      {open && (
        <div className="adm-bell-panel">
          <strong>Скоро важные даты</strong>
          {items.length === 0 && <span className="adm-muted">В ближайшие 2 дня событий нет</span>}
          {items.map((r, i) => (
            <button
              className="adm-bell-item"
              key={i}
              onClick={() => { setOpen(false); onOpen(r.clientId); }}
              type="button"
            >
              <span className={r.days === 0 ? "adm-bell-when today" : "adm-bell-when"}>
                {r.when} · {r.date}
              </span>
              <span>{r.person} ({r.relation})</span>
              <span className="adm-muted">{r.clientName} · {r.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = загрузка
  const logoutLocal = useCallback(() => setMe(null), []);

  useEffect(() => {
    api<Me>("/api/admin/me").then(setMe).catch(() => setMe(null));
  }, []);

  if (me === undefined) return <main className="adm"><p>Загрузка…</p></main>;
  if (me === null) return <Login onDone={setMe} />;
  return <Panel me={me} onLogout={logoutLocal} />;
}

function Login({ onDone }: { onDone: (me: Me) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onDone(await api<Me>("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="adm">
      <form className="adm-login" onSubmit={submit}>
        <h1>ROYAL FLOWERS · вход</h1>
        <input autoComplete="username" onChange={(e) => setEmail(e.target.value)} placeholder="Почта" required type="email" value={email} />
        <input autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" required type="password" value={password} />
        {error && <p className="adm-error">{error}</p>}
        <button disabled={busy} type="submit">{busy ? "Входим…" : "Войти"}</button>
      </form>
    </main>
  );
}

function Panel({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(
    async (query: string) => {
      try {
        const data = await api<{ clients: Client[] }>(`/api/admin/clients?q=${encodeURIComponent(query)}`);
        setRows(data.clients);
        setError("");
      } catch (err) {
        if ((err as { status?: number }).status === 401) onLogout();
        else setError((err as Error).message);
      }
    },
    [onLogout],
  );

  useEffect(() => {
    const timer = setTimeout(() => load(q), 300);
    return () => clearTimeout(timer);
  }, [q, load]);

  async function logout() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => null);
    onLogout();
  }

  return (
    <main className="adm">
      <div className="adm-top">
        <h1>Клиенты</h1>
        <div className="adm-actions">
          <Bell onLogout={onLogout} onOpen={setOpenId} />
          <span className="adm-muted">{me.email} · {me.role === "owner" ? "владелец" : "сотрудник"}</span>
          {me.role === "owner" && (
            <>
              <a className="adm-btn ghost" href="/api/admin/export?format=xlsx">Excel</a>
              <a className="adm-btn ghost" href="/api/admin/export?format=csv">CSV клиенты</a>
              <a className="adm-btn ghost" href="/api/admin/export?format=csv&kind=history">CSV история</a>
            </>
          )}
          <button className="ghost" onClick={logout} type="button">Выйти</button>
        </div>
      </div>

      <input className="adm-search" onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени, номеру WhatsApp или номеру карты" value={q} />
      {error && <p className="adm-error">{error}</p>}

      <div className="adm-table-wrap">
        <table>
          <thead>
            <tr><th>Имя</th><th>WhatsApp</th><th>Карта</th><th>Баллы</th><th>Создана</th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} onClick={() => setOpenId(c.id)}>
                <td>{c.full_name}</td>
                <td>{c.phone}</td>
                <td>{c.card_number}</td>
                <td>{c.balance}</td>
                <td>{new Date(c.created_at).toLocaleDateString("ru-RU")}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="adm-muted">Никого не найдено</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="adm-muted">Показаны последние 100 клиентов. Остальных ищите через поиск.</p>

      {openId && (
        <Drawer key={openId} id={openId} me={me} onClose={() => setOpenId(null)} onChanged={() => load(q)} />
      )}
    </main>
  );
}

function Drawer({ id, me, onClose, onChanged }: { id: string; me: Me; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dates, setDates] = useState<DateRow[]>([]);
  const [kind, setKind] = useState<"accrual" | "redemption">("accrual");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api<Detail>(`/api/admin/clients/${id}`);
    setDetail(data);
    setName(data.client.full_name);
    setPhone(data.client.phone);
    setDates(data.dates);
  }, [id]);

  useEffect(() => {
    load().catch((err: Error) => { setMessage(err.message); setIsError(true); });
  }, [load]);

  async function run(action: () => Promise<string | void>) {
    setBusy(true);
    setMessage("");
    try {
      const done = await action();
      if (done) { setMessage(done); setIsError(false); }
    } catch (err) {
      setMessage((err as Error).message);
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  const save = () => run(async () => {
    await api(`/api/admin/clients/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name,
        phone,
        dates: dates.map((d) => ({ person: d.person, relation: d.relation, date: d.event_date })),
      }),
    });
    await load();
    onChanged();
    return "Сохранено";
  });

  const addTransaction = () => run(async () => {
    await api(`/api/admin/clients/${id}/transactions`, {
      method: "POST",
      body: JSON.stringify({ type: kind, amount: Number(amount), comment }),
    });
    setAmount("");
    setComment("");
    await load();
    onChanged();
    return "Операция добавлена";
  });

  const remove = () => run(async () => {
    if (!confirm("Удалить клиента вместе с датами и историей баллов? Это нельзя отменить.")) return;
    await api(`/api/admin/clients/${id}`, { method: "DELETE" });
    onChanged();
    onClose();
  });

  const setDate = (index: number, field: keyof DateRow, value: string) =>
    setDates((list) => list.map((d, i) => (i === index ? { ...d, [field]: value } : d)));

  return (
    <div className="adm-overlay" onClick={onClose}>
      <div className="adm-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="adm-top">
          <h2>Карточка клиента</h2>
          <button className="ghost" onClick={onClose} type="button">Закрыть</button>
        </div>

        {!detail ? (
          <p>Загрузка…</p>
        ) : (
          <>
            <div className="adm-card">
              <div className="adm-muted">
                Карта {detail.client.card_number} · создана {when(detail.client.created_at)}
                {detail.client.consent_at && <> · согласие {when(detail.client.consent_at)}</>}
              </div>
              <input onChange={(e) => setName(e.target.value)} placeholder="Имя" value={name} />
              <input onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp" value={phone} />

              <strong>Важные даты</strong>
              {dates.map((d, i) => (
                <div className="adm-row" key={i}>
                  <input onChange={(e) => setDate(i, "person", e.target.value)} placeholder="Кто / что" value={d.person} />
                  <input onChange={(e) => setDate(i, "relation", e.target.value)} placeholder="Кем приходится" value={d.relation} />
                  <input onChange={(e) => setDate(i, "event_date", e.target.value)} type="date" value={d.event_date} />
                  <button aria-label="Удалить дату" className="ghost" onClick={() => setDates((l) => l.filter((_, k) => k !== i))} type="button">×</button>
                </div>
              ))}
              <button className="ghost" onClick={() => setDates((l) => [...l, { person: "", relation: "", event_date: "" }])} type="button">+ Добавить дату</button>
              <button disabled={busy} onClick={save} type="button">Сохранить изменения</button>
            </div>

            <div className="adm-card">
              <strong>Баллы: {detail.client.balance}</strong>
              <div className="adm-inline">
                <select onChange={(e) => setKind(e.target.value as "accrual" | "redemption")} value={kind}>
                  <option value="accrual">Начислить</option>
                  <option value="redemption">Списать</option>
                </select>
                <input min={1} onChange={(e) => setAmount(e.target.value)} placeholder="Количество баллов" type="number" value={amount} />
              </div>
              <input onChange={(e) => setComment(e.target.value)} placeholder="Комментарий (необязательно)" value={comment} />
              <button disabled={busy || !amount} onClick={addTransaction} type="button">Провести операцию</button>

              <strong>История</strong>
              {detail.transactions.length === 0 && <span className="adm-muted">Операций пока нет</span>}
              {detail.transactions.map((t) => (
                <div className="adm-tx" key={t.id}>
                  <span>
                    {when(t.created_at)}
                    {t.comment ? ` · ${t.comment}` : ""}
                    <br /><span className="adm-muted">{t.created_by}</span>
                  </span>
                  <strong className={t.points > 0 ? "plus" : "minus"}>{t.points > 0 ? `+${t.points}` : t.points}</strong>
                </div>
              ))}
            </div>

            {me.role === "owner" && (
              <button className="danger" disabled={busy} onClick={remove} type="button">Удалить клиента</button>
            )}
          </>
        )}
        {message && <p className={isError ? "adm-error" : "adm-ok"}>{message}</p>}
      </div>
    </div>
  );
}