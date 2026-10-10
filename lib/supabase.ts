import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

// Singleton browser client – safe to import in Client Components
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ── Status enum ──────────────────────────────────────────────────────────────
export type TransactionStatus = "PENDING" | "COMPLETED" | "CANCELLED";

// Type definitions that mirror the DB schema (v2 — with UPI tracking)
export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  user_note: string | null;
  created_at: string;
  payee_upi_id: string | null;
  status: TransactionStatus;
  upi_ref: string | null;
};

