import { NextResponse } from "next/server";
import { deleteClient } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return NextResponse.json({ error: "Некорректный номер клиента." }, { status: 400 });
  }

  if (!deleteClient(id)) {
    return NextResponse.json({ error: "Клиент не найден." }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
