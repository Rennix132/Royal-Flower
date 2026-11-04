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
  alreadyRegistered: boolean;
};

const emptyDate = (): ImportantDate => ({
  id: crypto.randomUUID(),
  person: "",
  relation: "",
  date: "",
});

export default function LoyaltyForm() {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [card, setCard] = useState<LoyaltyCard | null>(null);

  function updateDate(id: string, field: keyof Omit<ImportantDate, "id">, value: string) {
    setDates((currentDates) =>
      currentDates.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      consent: formData.get("consent") === "on",
      importantDates: dates.map(({ person, relation, date }) => ({
        person,
        relation,
        date,
      })),
    };

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: {
        error?: string;
        cardNumber?: string;
        name?: string;
        dateCount?: number;
        alreadyRegistered?: boolean;
      } = await response.json();

      if (!response.ok) {
        setError(
          result.error ??
            "Не удалось сохранить данные. Проверьте соединение и попробуйте ещё раз.",
        );
        return;
      }

      if (!result.cardNumber || !result.name || result.dateCount === undefined) {
        setError("Не удалось получить карту. Пожалуйста, попробуйте ещё раз.");
        return;
      }

      setCard({
        cardNumber: result.cardNumber,
        name: result.name,
        dateCount: result.dateCount,
        alreadyRegistered: result.alreadyRegistered ?? false,
      });
    } catch {
      setError("Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (card) {
    return (
      <section aria-live="polite" className="result-panel">
        <div aria-hidden="true" className="success-flower">✿</div>
        <p className="eyebrow">
          {card.alreadyRegistered ? "ВАША КАРТА УЖЕ АКТИВНА" : "ВАША КАРТА ГОТОВА"}
        </p>
        <h2>{card.alreadyRegistered ? "С возвращением!" : "Теперь важные даты под защитой"}</h2>
        <div className="loyalty-card">
          <span className="card-overline">ЭЛЕКТРОННАЯ КАРТА ЛОЯЛЬНОСТИ</span>
          <span className="card-brand">ROYAL FLOWERS</span>
          <span className="card-flower" aria-hidden="true">✿</span>
          <span className="card-holder">{card.name}</span>
          <span className="card-number">{card.cardNumber}</span>
          <span className="card-saved-dates">
            {card.alreadyRegistered
              ? "Даты в анкете не изменены. Покажите карту флористу"
              : `Сохранено важных дат: ${card.dateCount}`}
          </span>
        </div>
        <p className="result-hint">
          {card.alreadyRegistered
            ? "Чтобы добавить или исправить дату, обратитесь к флористу."
            : "Сделайте снимок экрана, чтобы карта всегда была под рукой."}
        </p>
      </section>
    );
  }

  return (
    <form className="loyalty-form" onSubmit={handleSubmit}>
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
          Я согласен(на) на обработку персональных данных в соответствии с{" "}
          <a href="/privacy" target="_blank">политикой конфиденциальности</a>.
        </span>
      </label>

      {error && (
        <p aria-live="polite" className="form-error" role="alert">
          {error}
        </p>
      )}

      <button className="submit-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Сохраняем…" : "Получить карту ROYAL FLOWERS"}
        {!isSubmitting && <span aria-hidden="true">→</span>}
      </button>
      <p className="form-footnote">Без паролей и приложений. Только цветы и забота.</p>
    </form>
  );
}
