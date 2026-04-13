"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const detail = searchParams.get("detail");

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">OA Weekend</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in with your ONE&amp;ALL account
          </p>
        </div>
        {error && (
          <div className="space-y-1">
            <p className="text-sm text-red-600">
              Sign in failed ({error}). Please try again.
            </p>
            {detail && (
              <p className="text-xs text-red-400 break-all">{detail}</p>
            )}
          </div>
        )}
        <a
          href="/api/auth/login"
          className="block w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          Sign in with ONE&amp;ALL
        </a>
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
