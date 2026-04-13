import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  // If already logged in, go to operator
  const session = await auth();
  if (session?.user) {
    redirect("/operator");
  }

  // Get CSRF token for the form
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">OA Weekend</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Sign in with your ONE&amp;ALL account
          </p>
        </div>
        <form method="POST" action="/api/auth/signin/rock">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="callbackUrl" value="/operator" />
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
          >
            Sign in with ONE&amp;ALL
          </button>
        </form>
      </div>
    </main>
  );
}
