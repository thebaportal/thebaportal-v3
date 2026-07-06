import { NextResponse } from "next/server";
import * as https from "https";

function validateFullName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Please enter your full name";
  if (/[^a-zA-Z\s]/.test(trimmed)) return "Name must contain letters and spaces only — no numbers or special characters";
  const words = trimmed.split(" ").filter(w => w.length > 0);
  if (words.length < 2) return "Please enter both your first and last name";
  if (words.some(w => w.length < 2)) return "Each name must be at least 2 letters";
  return "";
}

function toTitleCase(str: string) {
  return str.trim().replace(/\s+/g, " ")
    .split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
}

function supabaseAdminRequest(path: string, method: string, body: object): Promise<{ status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL! + path);
    const options: https.RequestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Length": Buffer.byteLength(payload),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", chunk => { raw += chunk; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode ?? 0, data: { raw } }); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export async function POST(req: Request) {
  try {
    const { email, password, fullName } = await req.json();

    const nameErr = validateFullName(String(fullName ?? ""));
    if (nameErr) return NextResponse.json({ error: nameErr, field: "name" }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ error: "Please enter a valid email address", field: "email" }, { status: 400 });
    if (!password || String(password).length < 8) return NextResponse.json({ error: "Password must be at least 8 characters", field: "password" }, { status: 400 });

    const { status, data } = await supabaseAdminRequest("/auth/v1/admin/users", "POST", {
      email: email.toLowerCase().trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: toTitleCase(String(fullName)) },
    });

    if (status === 422 || (data.msg && String(data.msg).toLowerCase().includes("already"))) {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead.", field: "email" }, { status: 409 });
    }
    if (status !== 200 && status !== 201) {
      const msg = (data.msg || data.message || data.error || "Signup failed") as string;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Signup API error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
