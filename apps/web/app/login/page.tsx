"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="rounded-[--radius-card] bg-oa-white p-8 shadow-[--shadow-card] space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-oa-black-900">
              OA Weekend
            </h1>
            <p className="text-sm text-oa-black-700">
              Sign in with your ONE&amp;ALL account
            </p>
          </div>

          {error && (
            <div className="rounded-[--radius-badge] bg-red-50 border border-red-100 p-3 space-y-1">
              <p className="text-sm text-red-700 font-medium">
                {error === "unauthorized"
                  ? "Access denied. Your account is not authorized to use this application."
                  : "Sign in failed. Please try again."}
              </p>
            </div>
          )}

          <a
            href="/api/auth/login"
            className="flex items-center justify-center gap-2 w-full rounded-[--radius-button] bg-oa-black-900 py-3.5 text-sm font-semibold text-white hover:bg-oa-black-800 transition-colors duration-150"
          >
            Sign in with ONE&amp;ALL
          </a>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginContent />
    </Suspense>
  );
}
