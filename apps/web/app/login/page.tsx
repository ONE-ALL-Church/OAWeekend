"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Invalid password");
        return;
      }

      const redirect = searchParams.get("redirect") ?? "/operator";
      router.push(redirect);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">OA Weekend</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter operator password
        </p>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm focus:border-neutral-500 focus:outline-none"
        autoFocus
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <Suspense
        fallback={
          <div className="text-sm text-neutral-400">Loading...</div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
