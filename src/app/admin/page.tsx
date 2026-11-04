import Link from "next/link";
import { getAdminClients } from "@/lib/db";
import ClientActions from "./client-actions";

export const dynamic = "force-dynamic";

function displayDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function displayDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function cardLabel(count: number) {
  const plural = new Intl.PluralRules("ru").select(count);
  if (plural === "one") {
    return "карта лояльности";
  }
  if (plural === "few") {
    return "карты лояльности";
  }
  return "карт лояльности";
}

export default function AdminPage() {
  const clients = getAdminClients();

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <Link className="admin-brand" href="/">ROYAL FLOWERS</Link>
        <span>Панель магазина</span>
      </header>

      <section className="admin-content">
        <div className="admin-title-row">
          <div>
            <p className="eyebrow">ПРОГРАММА ЛОЯЛЬНОСТИ</p>
            <h1>Клиенты</h1>
          </div>
          <Link className="admin-back-link" href="/">На главную <span aria-hidden="true">↗</span></Link>
        </div>

        <div className="admin-summary">
          <span className="summary-number">{clients.length}</span>
          <span>{cardLabel(clients.length)}</span>
        </div>

        {clients.length === 0 ? (
          <div className="admin-empty">
            <span aria-hidden="true">✿</span>
            <p>Пока нет зарегистрированных клиентов.</p>
          </div>
        ) : (
          <div className="client-list">
            {clients.map((client) => (
              <article className="client-card" key={client.id}>
                <div className="client-main">
                  <div className="client-name-line">
                    <h2>{client.name}</h2>
                    <span className="client-card-number">{client.cardNumber}</span>
                  </div>
                  <a className="client-phone" href={`https://wa.me/${client.phone.slice(1)}`}>
                    {client.phone}
                  </a>
                  <p className="client-created">Карта создана {displayDateTime(client.createdAt)}</p>
                  <ClientActions clientId={client.id} />
                </div>
                <div className="client-dates">
                  <p className="dates-title">ВАЖНЫЕ ДАТЫ · {client.dates.length}</p>
                  {client.dates.length > 0 ? (
                    <ul>
                      {client.dates.map((item, index) => (
                        <li key={`${client.id}-${item.date}-${item.person}-${index}`}>
                          <span>{displayDate(item.date)}</span>
                          <span>{item.person} <span className="date-relation">· {item.relation}</span></span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-dates">Клиент пока не добавил даты</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
