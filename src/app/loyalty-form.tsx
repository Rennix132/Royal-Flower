"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type ImportantDate = {
  id: string;
  person: string;
  relation: string;
  date: string;
};

type LoyaltyCard = {
  cardNumber: string;
  name: string;
  dateCount: number;
};

// Простой счётчик для уникальных id (работает на любом адресе, не только на https)
let dateCounter = 0;

const emptyDate = (): ImportantDate => ({
  id: `date-${++dateCounter}`,
  person: "",
  relation: "",
  date: "",
});

export default function LoyaltyForm() {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  function updateDate(id: string, field: keyof Omit<ImportantDate, "id">, value: string) {
    setDates((currentDates) =>
      currentDates.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const formData = new FormData(event.currentTarget);

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          phone: String(formData.get("phone") ?? ""),
          website: String(formData.get("website") ?? ""),
          consent: formData.get("consent") === "on",
          dates: dates.map(({ person, relation, date }) => ({ person, relation, date })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Не удалось оформить карту. Попробуйте ещё раз.");
        return;
      }
      setCard(data as LoyaltyCard);
    } catch {
      setError("Нет связи с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  }

  if (card) {
    return (
      <section aria-live="polite" className="result-panel">
        <div aria-hidden="true" className="success-flower">✿</div>
        <p className="eyebrow">КАРТА ОФОРМЛЕНА</p>
        <h2>Ваша карта лояльности</h2>
        <div className="loyalty-card">
          <span className="card-overline">КАРТА ЛОЯЛЬНОСТИ</span>
          <span className="card-brand">ROYAL FLOWERS</span>
          <span className="card-flower" aria-hidden="true">✿</span>
          <span className="card-holder">{card.name}</span>
          <span className="card-number">{card.cardNumber}</span>
          <span className="card-saved-dates">
            Сохранено важных дат: {card.dateCount}
          </span>
        </div>
        <p className="result-hint">
          Сохраните номер карты. Ваши данные записаны, и карта не потеряется, даже если вы смените телефон.
        </p>
      </section>
    );
  }

  return (
    <form className="loyalty-form" onSubmit={handleSubmit}>
      {/* Скрытое поле-ловушка для ботов: людям его не видно */}
      <input
        aria-hidden="true"
        autoComplete="off"
        name="website"
        style={{ position: "absolute", left: "-9999px", opacity: 0 }}
        tabIndex={-1}
      />

      <div className="form-heading">
        <span className="form-step">01</span>
        <h2>Расскажите о себе</h2>
      </div>

      <label className="field">
        <span>Ваше имя</span>
        <input
          autoComplete="name"
          maxLength={100}
          name="name"
          placeholder="Как к вам обращаться?"
          required
        />
      </label>

      <label className="field">
        <span>Номер WhatsApp</span>
        <input
          autoComplete="tel"
          inputMode="tel"
          maxLength={24}
          name="phone"
          placeholder="+7 (___) ___-__-__"
          required
          type="tel"
        />
        <span className="field-hint">Укажите номер с кодом +7</span>
      </label>

      <div className="dates-heading">
        <div className="form-heading">
          <span className="form-step">02</span>
          <div>
            <h2>Важные даты</h2>
            <p>Дни рождения и другие поводы</p>
          </div>
        </div>
        {dates.length === 0 && <span className="optional-label">необязательно</span>}
      </div>

      {dates.map((item, index) => (
        <fieldset className="date-entry" key={item.id}>
          <legend>Дата {index + 1}</legend>
          <button
            aria-label={`Удалить дату ${index + 1}`}
            className="remove-date"
            onClick={() => setDates((current) => current.filter((date) => date.id !== item.id))}
            type="button"
          >
            ×
          </button>
          <label className="field">
            <span>Имя близкого или событие</span>
            <input
              autoComplete="off"
              maxLength={100}
              onChange={(event) => updateDate(item.id, "person", event.target.value)}
              placeholder="Например, Анна или годовщина"
              required
              value={item.person}
            />
          </label>
          <label className="field">
            <span>Кем приходится или повод</span>
            <input
              autoComplete="off"
              maxLength={60}
              onChange={(event) => updateDate(item.id, "relation", event.target.value)}
              placeholder="Мама, друг, день свадьбы…"
              required
              value={item.relation}
            />
          </label>
          <label className="field">
            <span>Дата рождения или события</span>
            <input
              onChange={(event) => updateDate(item.id, "date", event.target.value)}
              required
              type="date"
              value={item.date}
            />
          </label>
        </fieldset>
      ))}

      <button className="add-date-button" onClick={() => setDates((current) => [...current, emptyDate()])} type="button">
        <span aria-hidden="true">+</span> Добавить дату
      </button>

      <label className="consent-field">
        <input name="consent" required type="checkbox" />
        <span>
          Я согласен(на) на обработку моих персональных данных и данных, которые я указал(а) о близких, для участия в программе лояльности.{" "}
          <a href="/privacy" target="_blank">Подробнее</a>.
        </span>
      </label>

      {error && (
        <p role="alert" style={{ color: "#b3261e", margin: "0 0 12px" }}>
          {error}
        </p>
      )}

      <button className="submit-button" disabled={sending} type="submit">
        {sending ? "Оформляем…" : "Получить карту ROYAL FLOWERS"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="form-footnote">Данные хранятся на защищённом сервере и видны только сотрудникам магазина.</p>
    </form>
  );
}