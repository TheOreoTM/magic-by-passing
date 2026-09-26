import type { Metadata } from "next";
import Link from "next/link";

import { SubmitButton } from "@/components/ui/submit-button";
import { deterministicShuffle } from "@/features/connections/domain/shuffle";
import { listAdminConnectionsPuzzles } from "@/features/connections/server/admin";
import { requireAdmin } from "@/lib/authorization";
import {
  addUtcDays,
  enumerateUtcDates,
  parseUtcDateKey,
  startOfUtcDate,
  utcDateKey,
} from "@/lib/utc-date";

import { ConnectionsAiGeneratorPanel } from "./ai-generator-panel";
import {
  approveConnectionsPuzzleAction,
  returnConnectionsPuzzleToDraftAction,
  saveConnectionsPuzzleAction,
  voidConnectionsPuzzleAction,
} from "./actions";

export const metadata: Metadata = { title: "Connections Admin" };
export const maxDuration = 120;

function monthBounds(month: string) {
  const first = parseUtcDateKey(`${month}-01`);
  const next = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1),
  );
  return { first, last: addUtcDays(next, -1) };
}

function shiftMonth(month: string, offset: number) {
  const first = parseUtcDateKey(`${month}-01`);
  return new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + offset, 1),
  )
    .toISOString()
    .slice(0, 7);
}

function validDateKey(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return utcDateKey(parseUtcDateKey(value));
  } catch {
    return null;
  }
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

export default async function ConnectionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    date?: string;
    notice?: string;
  }>;
}) {
  await requireAdmin("/admin/connections");
  const params = await searchParams;
  const tomorrowKey = utcDateKey(addUtcDays(new Date(), 1));
  const selectedDateKey = validDateKey(params.date) ?? tomorrowKey;
  const requestedMonth = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? params.month!
    : selectedDateKey.slice(0, 7);

  let month = requestedMonth;
  let bounds: ReturnType<typeof monthBounds>;
  try {
    bounds = monthBounds(month);
  } catch {
    month = tomorrowKey.slice(0, 7);
    bounds = monthBounds(month);
  }

  const puzzles = await listAdminConnectionsPuzzles(bounds.first, bounds.last);
  const puzzlesByDate = new Map(
    puzzles.map((puzzle) => [puzzle.dateKey, puzzle]),
  );
  const selected = puzzlesByDate.get(selectedDateKey);
  const selectedDate = parseUtcDateKey(selectedDateKey);
  const canCreate = selectedDate > startOfUtcDate(new Date());
  const canAuthor = selected?.editable ?? canCreate;
  const editorGroups =
    selected?.domainPuzzle.groups ??
    Array.from({ length: 4 }, (_, index) => ({
      id: `new-group-${index + 1}`,
      position: index + 1,
      label: "",
      explanation: null,
      tiles: Array.from({ length: 4 }, (_, tileIndex) => ({
        id: `new-group-${index + 1}-${tileIndex}`,
        text: "",
      })),
    }));
  const previewTiles = selected?.domainPuzzle.groups.flatMap(
    (group) => group.tiles,
  );

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="border-border flex flex-col gap-4 border-b pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sage text-xs font-semibold tracking-[0.2em] uppercase">
              Connections administration
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight">
              Author daily puzzles
            </h1>
            <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
              Build four reviewed groups of four. Structural checks can catch
              duplicates, but fairness and accidental alternate groups still
              need a human pass.
            </p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm font-semibold">
            <Link
              href="/admin/frames"
              className="border-border rounded-lg border px-4 py-2"
            >
              Frames
            </Link>
            <Link
              href="/admin/dailies"
              className="border-border rounded-lg border px-4 py-2"
            >
              Guessr Dailies
            </Link>
          </nav>
        </header>

        {params.notice ? (
          <p
            className={`mt-5 rounded-xl border px-4 py-3 text-sm ${params.notice.startsWith("Error:") ? "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200" : "border-sage/30 bg-sage/10"}`}
            role={params.notice.startsWith("Error:") ? "alert" : "status"}
          >
            {params.notice}
          </p>
        ) : null}

        <section className="border-border bg-surface mt-6 rounded-2xl border p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <form
              action="/admin/connections"
              className="flex flex-wrap items-end gap-3"
            >
              <label className="text-muted grid gap-1 text-xs font-semibold tracking-wide uppercase">
                Open UTC date
                <input
                  type="date"
                  name="date"
                  defaultValue={selectedDateKey}
                  className="admin-input"
                />
              </label>
              <button
                type="submit"
                className="bg-sage rounded-lg px-4 py-3 text-sm font-semibold text-white"
              >
                Open
              </button>
            </form>
            <div className="flex items-center gap-4 text-sm font-semibold">
              <Link
                href={`/admin/connections?month=${shiftMonth(month, -1)}&date=${shiftMonth(month, -1)}-01`}
              >
                ← Previous
              </Link>
              <span className="font-serif text-xl">
                {bounds.first.toLocaleDateString("en", {
                  timeZone: "UTC",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <Link
                href={`/admin/connections?month=${shiftMonth(month, 1)}&date=${shiftMonth(month, 1)}-01`}
              >
                Next →
              </Link>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {enumerateUtcDates(bounds.first, bounds.last).map((date) => {
              const dateKey = utcDateKey(date);
              const puzzle = puzzlesByDate.get(dateKey);
              const isSelected = dateKey === selectedDateKey;
              return (
                <Link
                  key={dateKey}
                  href={`/admin/connections?month=${month}&date=${dateKey}`}
                  className={`rounded-xl border p-3 transition-colors ${isSelected ? "border-sage bg-sage/10" : "border-border hover:border-sage/50"}`}
                >
                  <span className="block text-sm font-semibold">
                    {dateLabel(date)}
                  </span>
                  <span className="text-muted mt-1 block text-xs">
                    {puzzle?.displayState ?? "Unscheduled"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {canAuthor ? (
          <ConnectionsAiGeneratorPanel
            dateKey={selectedDateKey}
            replacesExistingDraft={Boolean(selected)}
          />
        ) : null}

        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <section className="border-border bg-surface rounded-2xl border p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                  {selectedDateKey} · UTC
                </p>
                <h2 className="mt-1 font-serif text-3xl">
                  {selected ? "Edit puzzle" : "New puzzle"}
                </h2>
              </div>
              <span className="bg-sage/15 text-sage rounded-full px-3 py-1 text-xs font-bold">
                {selected?.displayState ?? "UNSAVED"}
              </span>
            </div>

            {!canAuthor ? (
              <p className="border-border text-muted mt-4 rounded-xl border border-dashed p-4 text-sm leading-6">
                {selected?.canReturnToDraft
                  ? "This future puzzle is approved. Return it to draft before changing its answers."
                  : "Normal editing is locked once this UTC date begins."}
              </p>
            ) : null}

            {canAuthor ? (
              <form action={saveConnectionsPuzzleAction} className="mt-6">
                <input type="hidden" name="date" value={selectedDateKey} />
                <label className="text-muted grid gap-1 text-xs font-semibold tracking-wide uppercase">
                  Spoiler note
                  <input
                    className="admin-input"
                    name="spoilerNote"
                    maxLength={500}
                    defaultValue={selected?.spoilerNote ?? ""}
                    placeholder="Optional, e.g. Through season 1"
                  />
                </label>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  {editorGroups.map((group, groupIndex) => (
                    <fieldset
                      key={group.id}
                      className="border-border rounded-xl border p-4"
                    >
                      <legend className="px-2 text-sm font-bold">
                        Group {group.position}
                      </legend>
                      <label className="text-muted grid gap-1 text-xs font-semibold tracking-wide uppercase">
                        Category label
                        <input
                          className="admin-input"
                          name={`groups.${groupIndex}.label`}
                          maxLength={120}
                          defaultValue={group.label}
                          required
                        />
                      </label>
                      <label className="text-muted mt-3 grid gap-1 text-xs font-semibold tracking-wide uppercase">
                        Explanation
                        <input
                          className="admin-input"
                          name={`groups.${groupIndex}.explanation`}
                          maxLength={500}
                          defaultValue={group.explanation ?? ""}
                          placeholder="Optional reveal context"
                        />
                      </label>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {group.tiles.map((tile, tileIndex) => (
                          <label
                            key={tile.id}
                            className="text-muted grid gap-1 text-[11px] font-semibold tracking-wide uppercase"
                          >
                            Tile {tileIndex + 1}
                            <input
                              className="admin-input"
                              name={`groups.${groupIndex}.tiles.${tileIndex}`}
                              maxLength={80}
                              defaultValue={tile.text}
                              required
                            />
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>

                <SubmitButton
                  pendingLabel="Saving draft…"
                  className="bg-sage mt-5 rounded-lg px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                >
                  Save draft
                </SubmitButton>
              </form>
            ) : null}

            {selected ? (
              <div className="border-border mt-6 flex flex-wrap items-center gap-3 border-t pt-5">
                {selected.editable ? (
                  <form action={approveConnectionsPuzzleAction}>
                    <input type="hidden" name="puzzleId" value={selected.id} />
                    <input type="hidden" name="date" value={selectedDateKey} />
                    <SubmitButton
                      pendingLabel="Approving…"
                      className="bg-sage rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Approve puzzle
                    </SubmitButton>
                  </form>
                ) : null}
                {selected.canReturnToDraft ? (
                  <form action={returnConnectionsPuzzleToDraftAction}>
                    <input type="hidden" name="puzzleId" value={selected.id} />
                    <input type="hidden" name="date" value={selectedDateKey} />
                    <SubmitButton
                      pendingLabel="Returning…"
                      className="border-border rounded-lg border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      Return to draft
                    </SubmitButton>
                  </form>
                ) : null}
                {selected.status !== "VOID" &&
                !selected.editable &&
                !selected.canReturnToDraft ? (
                  <form
                    action={voidConnectionsPuzzleAction}
                    className="ml-auto flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="puzzleId" value={selected.id} />
                    <input type="hidden" name="date" value={selectedDateKey} />
                    <label className="text-muted flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        name="confirmVoid"
                        value="yes"
                        required
                      />
                      Invalidate this puzzle
                    </label>
                    <SubmitButton
                      pendingLabel="Voiding…"
                      className="rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60 dark:text-red-300"
                    >
                      VOID PUZZLE
                    </SubmitButton>
                  </form>
                ) : null}
              </div>
            ) : null}
          </section>

          <aside className="space-y-5">
            <section className="border-border bg-surface rounded-2xl border p-5">
              <h2 className="font-serif text-2xl">Shuffle previews</h2>
              <p className="text-muted mt-2 text-sm leading-6">
                These layouts help expose suspicious visual clusters. They do
                not replace checking for alternate valid answers.
              </p>
              {selected && previewTiles ? (
                <div className="mt-4 space-y-4">
                  {[1, 2, 3].map((previewNumber) => (
                    <div key={previewNumber}>
                      <p className="text-muted mb-2 text-xs font-semibold uppercase">
                        Arrangement {previewNumber}
                      </p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {deterministicShuffle(
                          previewTiles,
                          `${selected.id}:admin:${previewNumber}`,
                        ).map((tile) => (
                          <div
                            key={tile.id}
                            className="bg-background border-border flex min-h-14 items-center justify-center rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold break-words"
                          >
                            {tile.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border-border text-muted mt-4 rounded-xl border border-dashed p-5 text-center text-sm">
                  Save a valid draft to preview its shuffled boards.
                </p>
              )}
            </section>

            <section className="border-border bg-surface rounded-2xl border p-5">
              <h2 className="font-serif text-2xl">Human review</h2>
              <ul className="text-muted mt-3 space-y-2 text-sm leading-6">
                <li>• Every clue is from aired TV-anime material.</li>
                <li>• Each category label is fair once revealed.</li>
                <li>• No four tiles form an unintended alternate group.</li>
                <li>• Red herrings are challenging without being arbitrary.</li>
                <li>
                  • The spoiler note covers the latest referenced material.
                </li>
              </ul>
              {selected ? (
                <p className="border-border mt-4 border-t pt-4 text-xs">
                  {selected._count.attempts} recorded attempt
                  {selected._count.attempts === 1 ? "" : "s"}
                </p>
              ) : null}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
