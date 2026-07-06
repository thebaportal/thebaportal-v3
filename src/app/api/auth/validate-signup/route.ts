import { NextResponse } from "next/server";

function validateFullName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Please enter your full name";
  if (/[^a-zA-Z\s]/.test(trimmed)) return "Name must contain letters and spaces only — no numbers or special characters";
  const words = trimmed.split(" ").filter(w => w.length > 0);
  if (words.length < 2) return "Please enter both your first and last name";
  if (words.some(w => w.length < 2)) return "Each name must be at least 2 letters";
  return "";
}

export async function POST(req: Request) {
  try {
    const { fullName } = await req.json();
    const error = validateFullName(String(fullName ?? ""));
    if (error) return NextResponse.json({ error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
