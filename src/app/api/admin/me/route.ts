import { getStaff } from "@/lib/auth";

export async function GET() {
  const staff = await getStaff();
  if (!staff) return Response.json({ error: "Нужно войти" }, { status: 401 });
  return Response.json(staff);
}