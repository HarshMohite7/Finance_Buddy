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

// Type definitions that mirror the DB schema
export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  user_note: string | null;
  category: string;
  created_at: string;
};
