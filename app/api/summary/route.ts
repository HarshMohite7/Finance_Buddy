import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// ── Singleton clients (API keys only — no user context needed here) ───────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Types ──────────────────────────────────────────────────────────────────────
type Transaction = {
  id: string;
  amount: number;
  category: string;
  user_note: string | null;
  created_at: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildCategoryBreakdown(txns: Transaction[]) {
  const map: Record<string, number> = {};
  for (const t of txns) {
    map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

// ── HTML email template ────────────────────────────────────────────────────────
function buildEmailHtml(
  total: number,
  breakdown: [string, number][],
  tip: string,
  date: string
): string {
  const rows = breakdown
    .map(
      ([cat, amt]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;font-size:14px;color:#3f3f46;">${cat}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;font-size:14px;font-weight:600;color:#18181b;text-align:right;">${formatCurrency(amt)}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Finance Buddy — Daily Summary</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;">
              <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;color:#c7d2fe;text-transform:uppercase;">Finance Buddy</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:700;color:#ffffff;">Daily Spending Summary</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#a5b4fc;">${date}</p>
            </td>
          </tr>

          <!-- Total card -->
          <tr>
            <td style="padding:28px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border-radius:12px;padding:0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0;font-size:12px;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Total Spent Today</p>
                    <p style="margin:6px 0 0;font-size:32px;font-weight:800;color:#4f46e5;">${formatCurrency(total)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Category breakdown -->
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.06em;">Breakdown by Category</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:8px;overflow:hidden;border:1px solid #f4f4f5;">
                ${rows}
              </table>
            </td>
          </tr>

          <!-- AI Tip -->
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border-radius:12px;border-left:4px solid #f59e0b;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.08em;">✨ Groq AI Financial Tip</p>
                    <p style="margin:0;font-size:14px;color:#92400e;line-height:1.6;">${tip}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 28px;">
              <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;line-height:1.6;">
                Finance Buddy · Powered by Supabase, Groq AI &amp; Resend<br/>
                This prompt was shared by Prathamesh Sir.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, accessToken, startOfDay, endOfDay } = body as {
      userId: string;
      email: string;
      // Supabase JWT forwarded from the browser session.
      // Required so auth.uid() resolves server-side and RLS is satisfied.
      accessToken: string;
      // Local-timezone midnight expressed as a UTC ISO string.
      // Computed client-side via new Date(y, m, d) so IST boundaries are correct.
      startOfDay: string;
      endOfDay: string;
    };

    if (!userId || !email || !accessToken || !startOfDay || !endOfDay) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // ── 1. Build a per-request authenticated Supabase client ─────────────────
    // Injecting the user's JWT into the Authorization header makes auth.uid()
    // resolve to the real user ID on every query, satisfying the RLS policy
    // "auth.uid() = user_id".  The old singleton anon client had auth.uid() = null
    // because no JWT was attached, so RLS silently returned zero rows.
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      }
    );

    // ── 2. Query with client-supplied local-timezone date range ──────────────
    // The old server-side todayUTCRange() used Date.UTC midnight, which cut off
    // at 00:00 UTC = 05:30 IST.  Any transaction logged between 00:00–05:30 IST
    // had a created_at in yesterday's UTC window and was silently excluded.
    // The dashboard now sends new Date(y, m, d, 0,0,0) / (23,59,59) which JS
    // converts to UTC automatically, preserving the correct local day boundary.
    const { data: txns, error: dbError } = await supabaseUser
      .from("user_transactions")
      .select("id, amount, category, user_note, created_at")
      .eq("user_id", userId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false });

    if (dbError) throw new Error(`Database error: ${dbError.message}`);

    const transactions = (txns as Transaction[]) ?? [];

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions found for today. Log an intent first!" },
        { status: 400 }
      );
    }

    // ── 3. Aggregate ─────────────────────────────────────────────────────────
    const total = transactions.reduce((s, t) => s + Number(t.amount), 0);
    const breakdown = buildCategoryBreakdown(transactions);

    // ── 4. Groq AI tip ───────────────────────────────────────────────────────
    const breakdownText = breakdown
      .map(([cat, amt]) => `${cat}: ${formatCurrency(amt)}`)
      .join(", ");

    const groqPrompt = `The user spent ${formatCurrency(total)} total today across these categories: ${breakdownText}. Write a 1-sentence, slightly snarky but helpful financial tip.`;

    const groqResponse = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: groqPrompt }],
      max_tokens: 100,
      temperature: 0.8,
    });

    const tip =
      groqResponse.choices[0]?.message?.content?.trim() ??
      "Track your spending — every rupee counts!";

    // ── 5. Send email via Resend ─────────────────────────────────────────────
    const dateStr = new Date().toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const { error: emailError } = await resend.emails.send({
      from: "Finance Buddy <onboarding@resend.dev>",
      to: email,
      subject: `💰 Your Finance Buddy Summary for ${dateStr}`,
      html: buildEmailHtml(total, breakdown, tip, dateStr),
    });

    if (emailError) throw new Error(`Email error: ${emailError.message}`);

    return NextResponse.json({ success: true, tip });
  } catch (err: unknown) {
    console.error("[/api/summary] Error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
