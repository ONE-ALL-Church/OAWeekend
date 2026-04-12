import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">OA Weekend</h1>
        <p className="mt-2 text-lg text-neutral-500">
          ONE&amp;ALL Church weekend services platform
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/operator"
          className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700 transition-colors"
        >
          Operator Dashboard
        </Link>
      </div>
    </main>
  );
}
