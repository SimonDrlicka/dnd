import Link from "next/link";

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-6 py-12">
        <div className="w-full rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500">
              D&amp;D Utilities
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Session Menu
            </h1>
            <p className="max-w-lg text-base text-zinc-600">
              Start a new combat tracker or resume an existing fight.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/tracker"
                className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Open Combat Tracker
              </Link>
              <Link
                href="/inventory"
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 px-6 text-sm font-semibold text-zinc-700 transition hover:border-zinc-400"
              >
                Open Inventory
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
