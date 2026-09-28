"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Camera,
  IndianRupee,
  Loader2,
  Sparkles,
  Tag,
  FileText,
  BarChart3,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Food & Beverage",
  "Transport",
  "Groceries",
  "Shopping",
  "Utilities",
  "Entertainment",
  "Miscellaneous",
] as const;

type Category = (typeof CATEGORIES)[number];

// UPI deep-link as per PRD
const GPay_UPI = "upi://pay?pa=mohitevharsh777@oksbi&pn=Harsh";

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────
export default function IntentPage() {
  const router = useRouter();

  // ── Auth guard ──
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  // ── Form state ──
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  // ── Camera / Vision state ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [visionFailed, setVisionFailed] = useState(false);

  // category: null = not yet set | string = set (either by Groq or manual)
  const [category, setCategory] = useState<Category | null>(null);
  const [manualCategory, setManualCategory] = useState<Category>(CATEGORIES[0]);

  // ── Submission state ──
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────

  /** Called when the user picks / snaps a photo */
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show the preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setCategory(null);
    setVisionFailed(false);
    setAnalyzing(true);

    try {
      // Convert to base64 data-URL
      const base64 = await fileToBase64(file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, amount: Number(amount) || 0 }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = (await res.json()) as { category?: Category; error?: string };
      if (data.error || !data.category) throw new Error(data.error ?? "No category returned");

      setCategory(data.category);
    } catch (err) {
      console.error("[IntentPage] Vision failed:", err);
      // Graceful fallback: show manual dropdown
      setVisionFailed(true);
      setCategory(null);
    } finally {
      setAnalyzing(false);
      // Reset file input so the user can re-snap if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /** Save transaction to Supabase, then redirect to GPay */
  async function handleSaveAndPay(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setSaveError("Please enter a valid amount greater than 0.");
      return;
    }

    const finalCategory: Category = visionFailed ? manualCategory : (category ?? manualCategory);

    if (!userId) {
      setSaveError("Session expired. Please log in again.");
      router.replace("/");
      return;
    }

    setSaving(true);

    try {
      const { error: dbError } = await supabase.from("user_transactions").insert({
        user_id: userId,
        amount: parsedAmount,
        user_note: note.trim() || null,
        category: finalCategory,
      });

      if (dbError) throw dbError;

      setSavedOk(true);

      // Brief success flash, then redirect to GPay deep link
      setTimeout(() => {
        const upiUrl = `${GPay_UPI}&am=${parsedAmount}`;
        window.location.href = upiUrl;
      }, 800);
    } catch (err: unknown) {
      console.error("[IntentPage] Save failed:", err);
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  // ─────────────────────────────────────────────────────────────
  // Derived helpers
  // ─────────────────────────────────────────────────────────────
  const activeCategory: Category | null = visionFailed ? manualCategory : category;
  const canSubmit = !!amount && parseFloat(amount) > 0 && (!!activeCategory || visionFailed);

  // ─────────────────────────────────────────────────────────────
  // Loading skeleton while auth is being checked
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
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-indigo-600" />
            <span className="font-bold text-zinc-900">Finance Buddy</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="go-to-dashboard-btn"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
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

      {/* ── Main content ── */}
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center">
        <div className="w-full max-w-md space-y-4">
          {/* Greeting */}
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-zinc-900">Log Your Intent</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Snap a photo before you pay — Groq Vision will categorise it instantly.
            </p>
          </div>

          <Card className="shadow-xl ring-1 ring-zinc-100">
            <CardHeader className="border-b border-zinc-100 pb-4">
              <CardTitle className="text-base font-semibold text-zinc-900">
                New Spend Intent
              </CardTitle>
              <CardDescription className="text-xs">
                Logged as{" "}
                <span className="font-medium text-indigo-600">{userEmail}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              <form id="intent-form" onSubmit={handleSaveAndPay} className="space-y-5">
                {/* ── Amount ── */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount-input" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                    <IndianRupee className="h-3.5 w-3.5 text-indigo-500" />
                    Amount (₹)
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400 text-sm">
                      ₹
                    </span>
                    <Input
                      id="amount-input"
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-7 h-10 text-base font-semibold"
                      disabled={saving}
                    />
                  </div>
                </div>

                {/* ── Note ── */}
                <div className="space-y-1.5">
                  <Label htmlFor="note-input" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                    <FileText className="h-3.5 w-3.5 text-indigo-500" />
                    Quick Note
                    <span className="ml-1 font-normal normal-case text-zinc-400">(optional)</span>
                  </Label>
                  <Input
                    id="note-input"
                    type="text"
                    placeholder="e.g. Lunch at Sharma Dhaba"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-10"
                    disabled={saving}
                  />
                </div>

                {/* ── Camera Capture ── */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                    <Camera className="h-3.5 w-3.5 text-indigo-500" />
                    Snap Context
                  </Label>

                  {/* Hidden native file input – capture="environment" uses rear camera on mobile */}
                  <input
                    ref={fileInputRef}
                    id="camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={analyzing || saving}
                  />

                  <Button
                    id="snap-photo-btn"
                    type="button"
                    variant="outline"
                    className="w-full h-10 gap-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzing || saving}
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Groq Vision Analysing…
                      </>
                    ) : previewUrl ? (
                      <>
                        <Camera className="h-4 w-4" />
                        Re-take Photo
                      </>
                    ) : (
                      <>
                        <Camera className="h-4 w-4" />
                        Take Photo / Choose Image
                      </>
                    )}
                  </Button>

                  {/* Image preview */}
                  {previewUrl && (
                    <div className="relative overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Captured spending context"
                        className="max-h-40 w-full object-cover"
                      />
                      {analyzing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-sm">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                          <p className="text-xs font-medium text-white">Analysing with Groq Vision…</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Category Result / Fallback ── */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 uppercase tracking-wide">
                    <Tag className="h-3.5 w-3.5 text-indigo-500" />
                    Category
                  </Label>

                  {/* Groq returned a category */}
                  {!visionFailed && category && !analyzing && (
                    <div
                      id="category-display"
                      className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
                    >
                      <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-semibold text-emerald-800">{category}</span>
                      <span className="ml-auto text-xs text-emerald-500">via Groq Vision</span>
                    </div>
                  )}

                  {/* Awaiting photo */}
                  {!visionFailed && !category && !analyzing && (
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <Tag className="h-4 w-4 text-zinc-400 shrink-0" />
                      <span className="text-sm text-zinc-400">
                        Snap a photo to auto-categorise
                      </span>
                    </div>
                  )}

                  {/* Vision failed → manual fallback (per PRD requirement) */}
                  {visionFailed && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="text-xs text-amber-700">
                          Vision unavailable — select category manually
                        </span>
                      </div>
                      <select
                        id="manual-category-select"
                        value={manualCategory}
                        onChange={(e) => setManualCategory(e.target.value as Category)}
                        disabled={saving}
                        className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-zinc-800 outline-none focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-200"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* ── Error / Success feedback ── */}
                {saveError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 ring-1 ring-red-200"
                  >
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <p className="text-xs text-red-700">{saveError}</p>
                  </div>
                )}
                {savedOk && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700">
                      Intent saved! Redirecting to Google Pay…
                    </p>
                  </div>
                )}
              </form>
            </CardContent>

            <CardFooter className="flex-col gap-3 pt-4">
              {/* PRIMARY CTA — Save & Pay */}
              <Button
                id="save-and-pay-btn"
                type="submit"
                form="intent-form"
                className="w-full h-11 bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-semibold shadow-md shadow-indigo-200"
                disabled={!canSubmit || saving || analyzing || savedOk}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : savedOk ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Saved! Opening GPay…
                  </>
                ) : (
                  <>
                    <IndianRupee className="mr-1 h-4 w-4" />
                    Save &amp; Pay via GPay
                  </>
                )}
              </Button>

              <Button
                id="go-to-dashboard-footer-btn"
                type="button"
                variant="outline"
                className="w-full h-9 text-xs"
                onClick={() => router.push("/dashboard")}
              >
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                View Dashboard
              </Button>
            </CardFooter>
          </Card>

          {/* Hint text */}
          <p className="text-center text-xs text-zinc-400">
            Your data is private and secured by Supabase Row Level Security.
          </p>
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Utility: File → base64 data-URL
// ─────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}
