"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClientActions({ clientId }: { clientId: number }) {
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function deleteClient() {
    if (!window.confirm("Удалить карту и все сохранённые даты этого клиента?")) {
      return;
    }

    setError("");
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result: { error?: string } = await response.json();
        setError(result.error ?? "Не удалось удалить карту.");
        return;
      }

      router.refresh();
    } catch {
      setError("Не удалось связаться с сервером. Попробуйте ещё раз.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="client-actions">
      <button disabled={isDeleting} onClick={deleteClient} type="button">
        {isDeleting ? "Удаляем…" : "Удалить карту"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
