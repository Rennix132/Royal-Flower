import Image from "next/image";
import Link from "next/link";
import LoyaltyForm from "./loyalty-form";

export default function Home() {
  return (
    <main className="page-shell">
      <header className="site-header">
        <Link aria-label="ROYAL FLOWERS — главная" className="brand" href="/">
          <Image
            alt="ROYAL FLOWERS"
            className="brand-logo"
            height={100}
            priority
            src="/royal-flowers-wordmark.png"
            unoptimized
            width={190}
          />
        </Link>
        <span className="header-note">Эмоции в Деталях</span>
      </header>

      <section aria-labelledby="welcome-title" className="welcome-section">
        <div className="welcome-intro">
          <div aria-hidden="true" className="flower-mark">
            <svg viewBox="0 0 64 64" fill="none">
              <path
                d="M32 29.5c-8.6-8.2-5.7-18.8 0-22.8 5.7 4 8.6 14.6 0 22.8Z"
                fill="currentColor"
                opacity=".74"
              />
              <path
                d="M34.5 32c8.2-8.6 18.8-5.7 22.8 0-4 5.7-14.6 8.6-22.8 0Z"
                fill="currentColor"
                opacity=".57"
              />
              <path
                d="M32 34.5c8.6 8.2 5.7 18.8 0 22.8-5.7-4-8.6-14.6 0-22.8Z"
                fill="currentColor"
                opacity=".42"
              />
              <path
                d="M29.5 32c-8.2 8.6-18.8 5.7-22.8 0 4-5.7 14.6-8.6 22.8 0Z"
                fill="currentColor"
                opacity=".64"
              />
              <circle cx="32" cy="32" r="5" fill="#B77483" />
            </svg>
          </div>
          <p className="eyebrow">КАРТА ЛОЯЛЬНОСТИ</p>
          <h1 id="welcome-title">
            Добро пожаловать
            <br />
            в <span>ROYAL FLOWERS</span>
          </h1>
          <p className="welcome-copy">
            Оформите карту лояльности
            <br className="desktop-break" /> ROYAL FLOWERS за минуту.
          </p>
        </div>
        <LoyaltyForm />
      </section>

      <footer className="site-footer">
        <span>ROYAL FLOWERS</span>
        <span aria-hidden="true" className="footer-dot">✿</span>
        <Link href="/privacy">Конфиденциальность</Link>
      </footer>
    </main>
  );
}
