import { NextResponse } from "next/server";

function validateFullName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (trimmed.length < 3) return "Please enter your full name (first and last name)";
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) return "Please enter your full name (first and last name)";
  const words = trimmed.split(" ").filter(w => w.length > 0);
  if (words.length < 2) return "Please enter your full name (first and last name)";
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
