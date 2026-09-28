"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, type Transaction } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  IndianRupee,
  Loader2,
  LogOut,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Mail,
  BarChart3,
  TrendingUp,
  Wallet,
  ShoppingBag,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  "Food & Beverage": "#6366f1",
  Transport: "#10b981",
  Groceries: "#f59e0b",
  Shopping: "#ec4899",
  Utilities: "#3b82f6",
  Entertainment: "#8b5cf6",
  Miscellaneous: "#94a3b8",
};

const DEFAULT_COLOR = "#94a3b8";

type PieSlice = { name: string; value: number };
type BarEntry = { day: string; amount: number };

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function todayISOPrefix() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Last 7 days labels
function last7DayLabels() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
}

function buildPieData(txns: Transaction[]): PieSlice[] {
  const map: Record<string, number> = {};
  for (const t of txns) {
    map[t.category] = (map[t.category] ?? 0) + Number(t.amount);
  }
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

function buildBarData(txns: Transaction[]): BarEntry[] {
  const days = last7DayLabels();
  const map: Record<string, number> = {};
  for (const t of txns) {
    const day = t.created_at.slice(0, 10);
    map[day] = (map[day] ?? 0) + Number(t.amount);
  }
  return days.map((d) => ({
    day: new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
    amount: map[d] ?? 0,
  }));
}

// ─────────────────────────────────────────────────────────────
// Custom Tooltip for Bar Chart
// ─────────────────────────────────────────────────────────────
function CustomBarTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-zinc-700">{label}</p>
      <p className="text-indigo-600 font-bold">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();

  // ── Auth ──
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Data ──
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);       // All (for charts — today + history)
  const [todayTxns, setTodayTxns] = useState<Transaction[]>([]);    // Table rows (today only)
  const [dataLoading, setDataLoading] = useState(false);

  // ── Edit state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // ── Delete state ──
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Summary email ──
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryMsg, setSummaryMsg] = useState<string | null>(null);

  // ── Global error ──
  const [error, setError] = useState<string | null>(null);

  const fetchedRef = useRef(false);

  // ─────────────────────────────────────────────────────────────
  // Auth guard + initial data load
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/");
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? null);
      setAuthLoading(false);
    });
  }, [router]);

  const fetchData = useCallback(async (uid: string) => {
    setDataLoading(true);
    setError(null);
    try {
      // All transactions for charts (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: all, error: allErr } = await supabase
        .from("user_transactions")
        .select("*")
        .eq("user_id", uid)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (allErr) throw allErr;

      // Today's transactions for the table
      const todayStart = `${todayISOPrefix()}T00:00:00.000Z`;
      const todayEnd   = `${todayISOPrefix()}T23:59:59.999Z`;

      const { data: today, error: todayErr } = await supabase
        .from("user_transactions")
        .select("*")
        .eq("user_id", uid)
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .order("created_at", { ascending: false });

      if (todayErr) throw todayErr;

      setAllTxns((all as Transaction[]) ?? []);
      setTodayTxns((today as Transaction[]) ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchData(userId);
    }
  }, [userId, fetchData]);

  // ─────────────────────────────────────────────────────────────
  // CRUD handlers
  // ─────────────────────────────────────────────────────────────
  function startEdit(txn: Transaction) {
    setEditingId(txn.id);
    setEditAmount(String(txn.amount));
    setEditNote(txn.user_note ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditAmount("");
    setEditNote("");
  }

  async function saveEdit(id: string) {
    const parsed = parseFloat(editAmount);
    if (!parsed || parsed <= 0) return;
    setEditSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("user_transactions")
        .update({ amount: parsed, user_note: editNote.trim() || null })
        .eq("id", id);

      if (upErr) throw upErr;

      // Optimistic update in both state arrays
      const patch = (t: Transaction) =>
        t.id === id ? { ...t, amount: parsed, user_note: editNote.trim() || null } : t;
      setTodayTxns((prev) => prev.map(patch));
      setAllTxns((prev) => prev.map(patch));
      cancelEdit();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const { error: delErr } = await supabase
        .from("user_transactions")
        .delete()
        .eq("id", id);

      if (delErr) throw delErr;

      setTodayTxns((prev) => prev.filter((t) => t.id !== id));
      setAllTxns((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Send daily summary (Phase 4 trigger button)
  // ─────────────────────────────────────────────────────────────
  async function handleSendSummary() {
    if (!userId || !userEmail) return;
    setSummaryLoading(true);
    setSummaryMsg(null);
    try {
      // ── Grab the live session so we can forward the JWT ──────────────────
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }

      // ── Compute today's boundaries in the user's LOCAL timezone ──────────
      // new Date(y, m, d) uses the local clock — no UTC offset needed.
      const now = new Date();
      const localStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
      ).toISOString(); // converted to UTC by JS, reflecting the local offset

      const localEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      ).toISOString();

      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: userEmail,
          accessToken: session.access_token, // forward JWT → RLS satisfied
          startOfDay: localStart,            // local midnight in UTC
          endOfDay: localEnd,               // local 23:59:59 in UTC
        }),
      });

      // Guard: non-JSON response (e.g. stale HTML 404)
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          `Server returned an unexpected response (HTTP ${res.status}).`
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setSummaryMsg(`✅ Email sent! Tip: "${data.tip}"`);
    } catch (err: unknown) {
      setSummaryMsg(
        `❌ ${err instanceof Error ? err.message : "Could not send summary."}`
      );
    } finally {
      setSummaryLoading(false);
    }
  }



  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  // ─────────────────────────────────────────────────────────────
  // Derived chart data
  // ─────────────────────────────────────────────────────────────
  const pieData = buildPieData(allTxns);
  const barData = buildBarData(allTxns);
  const totalSpend = allTxns.reduce((s, t) => s + Number(t.amount), 0);
  const todaySpend = todayTxns.reduce((s, t) => s + Number(t.amount), 0);
  const hasData = allTxns.length > 0;

  // ─────────────────────────────────────────────────────────────
  // Loading skeleton
  // ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">

      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-zinc-900">Finance Buddy</span>
            <span className="ml-2 hidden rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 sm:inline">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              id="send-summary-btn"
              variant="outline"
              className="hidden gap-1.5 text-xs sm:flex"
              onClick={handleSendSummary}
              disabled={summaryLoading || !hasData}
            >
              {summaryLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              Send Daily Summary
            </Button>
            <button
              id="log-intent-btn"
              onClick={() => router.push("/intent")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              <Plus className="h-4 w-4" />
              Log Intent
            </button>
            <button
              id="sign-out-btn"
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">

        {/* ── SUMMARY EMAIL FEEDBACK ── */}
        {summaryMsg && (
          <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm font-medium ${summaryMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" : "bg-red-50 text-red-800 ring-1 ring-red-200"}`}>
            {summaryMsg}
          </div>
        )}

        {/* ── ERROR BANNER ── */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {/* ── PAGE HEADER ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-zinc-900">Spending Overview</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Logged as <span className="font-medium text-indigo-600">{userEmail}</span>
            {" · "}Last 7 days of activity
          </p>
        </div>

        {dataLoading ? (
          // ── LOADING STATE ──
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm text-zinc-500">Loading your transactions…</p>
          </div>
        ) : !hasData ? (
          // ────────────────────────────────────────────
          // EMPTY STATE (PRD requirement)
          // ────────────────────────────────────────────
          <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-zinc-200 bg-white py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
              <Wallet className="h-9 w-9 text-indigo-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-zinc-800">No transactions yet</p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                Log your first spending intent and come back to see your analytics here.
              </p>
            </div>
            <Button
              id="empty-log-intent-btn"
              className="bg-indigo-600 text-white hover:bg-indigo-700"
              onClick={() => router.push("/intent")}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Log Your First Intent
            </Button>
          </div>
        ) : (
          <>
            {/* ──────────────────────────────────────────
                STAT CARDS
            ────────────────────────────────────────── */}
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: "7-Day Total",
                  value: formatCurrency(totalSpend),
                  icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
                  bg: "bg-indigo-50",
                },
                {
                  label: "Today's Spend",
                  value: formatCurrency(todaySpend),
                  icon: <Wallet className="h-5 w-5 text-emerald-500" />,
                  bg: "bg-emerald-50",
                },
                {
                  label: "Transactions (7d)",
                  value: String(allTxns.length),
                  icon: <BarChart3 className="h-5 w-5 text-violet-500" />,
                  bg: "bg-violet-50",
                },
                {
                  label: "Categories",
                  value: String(new Set(allTxns.map((t) => t.category)).size),
                  icon: <ShoppingBag className="h-5 w-5 text-amber-500" />,
                  bg: "bg-amber-50",
                },
              ].map((s) => (
                <Card key={s.label} className="shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                      {s.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs text-zinc-500">{s.label}</p>
                      <p className="text-base font-bold text-zinc-900">{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ──────────────────────────────────────────
                CHARTS ROW
            ────────────────────────────────────────── */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

              {/* ── PIE CHART ── */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-800">
                    Spend by Category
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Breakdown across the last 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        label={((props: Record<string, unknown>) => {
                          const pct = typeof props.percent === "number" ? props.percent : 0;
                          return `${props.name ?? ""} ${(pct * 100).toFixed(0)}%`;
                        }) as any}
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CATEGORY_COLORS[entry.name] ?? DEFAULT_COLOR}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={((value: unknown) =>
                          formatCurrency(typeof value === "number" ? value : parseFloat(String(value)))
                        ) as any}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend
                        formatter={(value) => (
                          <span className="text-xs text-zinc-600">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* ── BAR CHART ── */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-zinc-800">
                    Daily Spending — Last 7 Days
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Total amount spent per day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={barData}
                      margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number | string) => `₹${v}`}
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                        width={56}
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar
                        dataKey="amount"
                        fill="#6366f1"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ──────────────────────────────────────────
                TODAY'S TRANSACTIONS TABLE
            ────────────────────────────────────────── */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold text-zinc-800">
                    Today&apos;s Transactions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {todayTxns.length === 0
                      ? "No transactions logged today yet."
                      : `${todayTxns.length} transaction${todayTxns.length > 1 ? "s" : ""} · Total ${formatCurrency(todaySpend)}`}
                  </CardDescription>
                </div>
                {/* Mobile send summary button */}
                <Button
                  id="send-summary-mobile-btn"
                  variant="outline"
                  className="flex gap-1.5 text-xs sm:hidden"
                  onClick={handleSendSummary}
                  disabled={summaryLoading || !hasData}
                >
                  {summaryLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  Email
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                {todayTxns.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <Wallet className="h-8 w-8 text-zinc-300" />
                    <p className="text-sm text-zinc-400">
                      No transactions today. Go log one!
                    </p>
                    <Button
                      id="table-empty-log-btn"
                      variant="outline"
                      className="text-xs"
                      onClick={() => router.push("/intent")}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Log Intent
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50">
                        <TableHead className="w-24 text-xs font-semibold text-zinc-600">
                          Time
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-zinc-600">
                          Category
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-zinc-600">
                          Note
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-zinc-600">
                          Amount
                        </TableHead>
                        <TableHead className="w-24 text-center text-xs font-semibold text-zinc-600">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {todayTxns.map((txn) => {
                        const isEditing = editingId === txn.id;
                        const isDeleting = deletingId === txn.id;

                        return (
                          <TableRow key={txn.id} className={isEditing ? "bg-indigo-50/40" : ""}>

                            {/* Time */}
                            <TableCell className="text-xs text-zinc-500">
                              {formatTime(txn.created_at)}
                            </TableCell>

                            {/* Category */}
                            <TableCell>
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: `${CATEGORY_COLORS[txn.category] ?? DEFAULT_COLOR}18`,
                                  color: CATEGORY_COLORS[txn.category] ?? DEFAULT_COLOR,
                                }}
                              >
                                {txn.category}
                              </span>
                            </TableCell>

                            {/* Note — editable */}
                            <TableCell className="max-w-[180px]">
                              {isEditing ? (
                                <Input
                                  id={`edit-note-${txn.id}`}
                                  value={editNote}
                                  onChange={(e) => setEditNote(e.target.value)}
                                  placeholder="Add a note…"
                                  className="h-7 text-xs"
                                  disabled={editSaving}
                                />
                              ) : (
                                <span className="truncate text-xs text-zinc-600">
                                  {txn.user_note ?? <span className="italic text-zinc-400">—</span>}
                                </span>
                              )}
                            </TableCell>

                            {/* Amount — editable */}
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  id={`edit-amount-${txn.id}`}
                                  type="number"
                                  min="1"
                                  step="0.01"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  className="h-7 w-24 text-right text-xs"
                                  disabled={editSaving}
                                />
                              ) : (
                                <span className="text-sm font-semibold text-zinc-800">
                                  {formatCurrency(Number(txn.amount))}
                                </span>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    {/* Save */}
                                    <button
                                      id={`save-edit-${txn.id}`}
                                      onClick={() => saveEdit(txn.id)}
                                      disabled={editSaving}
                                      className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                                      title="Save changes"
                                    >
                                      {editSaving ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Check className="h-3 w-3" />
                                      )}
                                    </button>
                                    {/* Cancel */}
                                    <button
                                      id={`cancel-edit-${txn.id}`}
                                      onClick={cancelEdit}
                                      disabled={editSaving}
                                      className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-200 text-zinc-600 hover:bg-zinc-300 disabled:opacity-50"
                                      title="Cancel"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {/* Edit */}
                                    <button
                                      id={`edit-btn-${txn.id}`}
                                      onClick={() => startEdit(txn)}
                                      disabled={isDeleting || !!deletingId || !!editingId}
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-30"
                                      title="Edit transaction"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    {/* Delete */}
                                    <button
                                      id={`delete-btn-${txn.id}`}
                                      onClick={() => handleDelete(txn.id)}
                                      disabled={isDeleting || !!editingId}
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                      title="Delete transaction"
                                    >
                                      {isDeleting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-zinc-100 bg-white py-6 mt-8">
        <p className="text-center text-xs text-zinc-400">
          Finance Buddy · Data secured by Supabase Row Level Security
        </p>
      </footer>
    </div>
  );
}
