"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
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
  IndianRupee,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Camera,
  Loader2,
} from "lucide-react";

type AuthMode = "login" | "signup";

export default function LandingPage() {
  const supabase = createClient();
  const router = useRouter();

  // --- Auth State ---
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        // Since "Confirm Email" is DISABLED in Supabase, user is immediately
        // logged in after sign-up – redirect straight to /intent.
        setSuccessMsg("Account created! Redirecting…");
        setTimeout(() => router.push("/intent"), 800);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/intent");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    setError(null);
    setSuccessMsg(null);
  }

  // Feature highlights shown below hero
  const features = [
    {
      icon: <Camera className="h-6 w-6 text-indigo-500" />,
      title: "Snap & Categorise",
      desc: "Point your camera at what you're buying. Groq Vision identifies the category in seconds.",
    },
    {
      icon: <IndianRupee className="h-6 w-6 text-emerald-500" />,
      title: "One-Tap GPay",
      desc: "Logging your intent triggers an instant redirect to Google Pay — no double-entry.",
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-violet-500" />,
      title: "Live Analytics",
      desc: "Recharts-powered pie and bar charts surface your spending habits at a glance.",
    },
    {
      icon: <Sparkles className="h-6 w-6 text-amber-500" />,
      title: "AI Financial Tips",
      desc: "Get a personalised, slightly snarky Groq AI tip emailed to you every day.",
    },
  ];

  return (
    <div className="flex flex-col min-h-full bg-zinc-50">
      {/* ── NAV ── */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-bold tracking-tight text-zinc-900">
              Finance Buddy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-400 hidden sm:inline">
              Secured by Supabase
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-white">
          {/* Gradient orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-100 opacity-60 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-emerald-100 opacity-60 blur-3xl"
          />

          <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-32">
            {/* Left: copy */}
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                <Sparkles className="h-3.5 w-3.5" />
                Powered by Groq AI · Supabase · Recharts
              </span>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
                Finance Buddy:
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-emerald-500 bg-clip-text text-transparent">
                  Track Intent,
                </span>
                <br />
                Not Just Receipts.
              </h1>
              <p className="max-w-md text-lg leading-relaxed text-zinc-600">
                Before you tap Pay, snap a photo and log your intent. Finance
                Buddy turns impulsive UPI payments into conscious, categorised
                spending — with real-time AI insights.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#auth-card"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-95"
                >
                  Get Started Free
                </a>
                <a
                  href="#features"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  See How It Works
                </a>
              </div>
            </div>

            {/* Right: Auth Card */}
            <div id="auth-card" className="flex justify-center lg:justify-end">
              <Card className="w-full max-w-sm shadow-xl ring-1 ring-zinc-100">
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-2xl font-bold text-zinc-900">
                    {mode === "login" ? "Welcome back" : "Create account"}
                  </CardTitle>
                  <CardDescription>
                    {mode === "login"
                      ? "Sign in to your Finance Buddy account."
                      : "Start tracking your spending intentions."}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <form
                    id="auth-form"
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        autoComplete={
                          mode === "login"
                            ? "current-password"
                            : "new-password"
                        }
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>

                    {/* Error / Success feedback */}
                    {error && (
                      <p
                        role="alert"
                        className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200"
                      >
                        {error}
                      </p>
                    )}
                    {successMsg && (
                      <p
                        role="status"
                        className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200"
                      >
                        {successMsg}
                      </p>
                    )}

                    <Button
                      id="auth-submit-btn"
                      type="submit"
                      className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {mode === "login" ? "Signing in…" : "Creating…"}
                        </>
                      ) : mode === "login" ? (
                        "Sign In"
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </CardContent>

                <CardFooter className="flex justify-center pt-0">
                  <p className="text-sm text-zinc-500">
                    {mode === "login"
                      ? "Don't have an account?"
                      : "Already have an account?"}{" "}
                    <button
                      id="auth-toggle-mode-btn"
                      type="button"
                      onClick={toggleMode}
                      className="font-semibold text-indigo-600 hover:underline"
                    >
                      {mode === "login" ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="bg-zinc-50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-zinc-900">
                Everything you need to spend consciously
              </h2>
              <p className="mt-3 text-zinc-500">
                A frictionless, AI-driven ledger built for the UPI generation.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <Card
                  key={f.title}
                  className="group border-zinc-100 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 ring-1 ring-zinc-100">
                      {f.icon}
                    </div>
                    <h3 className="mb-1.5 font-semibold text-zinc-900">
                      {f.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-500">
                      {f.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── WORKFLOW STEPS ── */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="mb-12 text-center text-3xl font-bold text-zinc-900">
              The &ldquo;Pitch It&rdquo; Workflow
            </h2>
            <ol className="space-y-6">
              {[
                {
                  step: "01",
                  title: "Open Finance Buddy",
                  desc: 'You\'re about to make a UPI payment. Before tapping Pay, open Finance Buddy and click "Log Intent".',
                },
                {
                  step: "02",
                  title: "Enter Amount & Snap a Photo",
                  desc: "Type the amount, add an optional note, then use your camera to capture the item or location.",
                },
                {
                  step: "03",
                  title: "Groq Vision Categorises",
                  desc: "The image is sent to Groq Vision which returns an instant category — Food & Beverage, Transport, and more.",
                },
                {
                  step: "04",
                  title: "Save & Pay via GPay",
                  desc: "Hit the button — your intent is saved to Supabase and you're instantly deep-linked into Google Pay.",
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900">{item.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">
                      {item.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-zinc-100 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-xs text-zinc-400">
            This prompt was shared by Prathamesh Sir. Finance Buddy is an
            AI-powered expense intent tracker built to fulfill the Major Project
            requirements, utilising Supabase, Groq AI, and Resend.
          </p>
        </div>
      </footer>
    </div>
  );
}
