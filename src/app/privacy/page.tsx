import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="privacy-shell">
      <Link className="privacy-brand" href="/">ROYAL FLOWERS</Link>
      <article className="privacy-content">
        <p className="eyebrow">КОНФИДЕНЦИАЛЬНОСТЬ</p>
        <h1>Как мы храним ваши данные</h1>
        <p>
          Для оформления карты лояльности мы сохраняем ваше имя, номер WhatsApp и важные даты,
          которые вы указали, а также историю начисления и списания баллов.
        </p>
        <h2>Кто видит данные</h2>
        <p>
          Данные хранятся на защищённом сервере и доступны только владельцу магазина и сотрудникам
          с разрешённым доступом. Мы не передаём их третьим лицам.
        </p>
        <h2>Как удалить данные</h2>
        <p>
          Чтобы исправить или удалить свои данные, обратитесь к нам в магазин, и мы удалим
          вашу карту и всю связанную информацию.
        </p>
        <Link className="privacy-back" href="/">Вернуться к форме <span aria-hidden="true">→</span></Link>
      </article>
      <p className="privacy-footer">ROYAL FLOWERS · С заботой о ваших данных</p>
    </main>
  );
}