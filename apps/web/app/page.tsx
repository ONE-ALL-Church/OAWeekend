import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 p-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-oa-yellow-500/10 px-4 py-1.5 text-sm font-medium text-oa-black-800">
          <span className="h-1.5 w-1.5 rounded-full bg-oa-yellow-500" />
          Weekend Services
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-oa-black-900">
          OA Weekend
        </h1>
        <p className="text-lg text-oa-black-700 max-w-md mx-auto">
          Live captioning platform for ONE&amp;ALL Church weekend services
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/operator"
          className="rounded-[--radius-button] bg-oa-black-900 px-8 py-3.5 text-sm font-semibold text-white hover:bg-oa-black-800 transition-colors duration-150"
        >
          Open Dashboard
        </Link>
        <Link
          href="/calendar"
          className="rounded-[--radius-button] bg-oa-yellow-500 px-8 py-3.5 text-sm font-semibold text-oa-black-900 hover:bg-oa-yellow-600 transition-colors duration-150"
        >
          Strategic Calendar
        </Link>
        <Link
          href="/login"
          className="rounded-[--radius-button] border border-oa-stone-300 bg-oa-white px-8 py-3.5 text-sm font-semibold text-oa-black-900 hover:bg-oa-stone-100 transition-colors duration-150"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
