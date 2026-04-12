"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">OA Weekend</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in with your ONE&amp;ALL account
          </p>
        </div>
        <button
          onClick={() => signIn("rock", { callbackUrl: "/operator" })}
          className="w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          Sign in with ONE&amp;ALL
        </button>
      </div>
    </main>
  );
}
