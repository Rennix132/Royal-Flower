import { createClient } from "@supabase/supabase-js";

function need(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Не задана переменная окружения ${name}`);
  return value;
}

const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Полный доступ к базе. Только на сервере!
export function db() {
  return createClient(need("SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), options);
}

// Только для проверки логина и пароля сотрудников
export function authClient() {
  return createClient(need("SUPABASE_URL"), need("SUPABASE_PUBLISHABLE_KEY"), options);
}