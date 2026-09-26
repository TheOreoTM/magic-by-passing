export default function UserProfileLoading() {
  return (
    <main
      className="min-h-screen px-5 py-10 sm:px-8 sm:py-16"
      role="status"
      aria-label="Loading player profile"
    >
      <div className="mx-auto max-w-6xl animate-pulse">
        <section>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="bg-border size-20 rounded-full sm:size-24" />
            <div className="w-full min-w-0 flex-1">
              <div className="bg-border h-4 w-24" />
              <div className="bg-border mt-3 h-10 w-72 max-w-full sm:h-12" />
              <div className="bg-border mt-3 h-4 w-28" />
            </div>
            <div className="grid gap-2 sm:justify-items-end">
              <div className="bg-border h-4 w-10" />
              <div className="bg-border h-10 w-14" />
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between gap-4">
              <div className="bg-border h-4 w-20" />
              <div className="bg-border h-4 w-44" />
            </div>
            <div className="bg-border mt-2 h-1.5 w-full rounded-full" />
          </div>
        </section>

        <div className="border-border mt-12 grid grid-cols-2 gap-x-8 gap-y-8 border-t pt-8 sm:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index}>
              <div className="bg-border h-4 w-24 max-w-full" />
              <div className="bg-border mt-2 h-7 w-14" />
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <section>
            <div className="bg-border h-6 w-36" />
            <div className="divide-border mt-5 divide-y">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="flex justify-between py-3.5">
                  <div className="bg-border h-4 w-24" />
                  <div className="bg-border h-4 w-16" />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="bg-border h-6 w-32" />
            <div className="mt-5 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index}>
                  <div className="bg-border h-4 w-32" />
                  <div className="mt-3 grid gap-2">
                    <div className="bg-border h-3 w-full" />
                    <div className="bg-border h-3 w-4/5" />
                  </div>
                  <div className="bg-border mt-3 h-3 w-14" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      <span className="sr-only">Loading player profile…</span>
    </main>
  );
}
