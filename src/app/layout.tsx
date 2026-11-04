import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROYAL FLOWERS — карта лояльности",
  description:
    "Сохраните важные даты близких и получите электронную карту лояльности ROYAL FLOWERS.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
