import type { Metadata } from "next";

import { SubmitButton } from "@/components/ui/submit-button";
import { ConnectionsBoard } from "@/features/connections/components/connections-board";
import {
  getCurrentConnectionsPuzzle,
  projectAnonymousConnectionsSession,
} from "@/features/connections/server/game";
import { readAnonymousConnectionsSession } from "@/features/connections/server/session";

import {
  startAnonymousConnections,
  submitAnonymousConnections,
} from "./actions";

export const metadata: Metadata = {
  title: "Connections",
  description:
    "Find four groups of four in the daily Frieren Connections puzzle.",
};

export const revalidate = 60;

export default async function ConnectionsPage() {
  const puzzle = await getCurrentConnectionsPuzzle();

  if (!puzzle) {
    return (
      <main className="px-5 py-16 sm:px-8 sm:py-24">
        <section className="mx-auto max-w-2xl text-center">
          <p className="text-muted text-sm font-medium">Connections</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            No puzzle is ready today.
          </h1>
          <p className="text-muted mx-auto mt-5 max-w-lg leading-7">
            Today&apos;s groups are still being prepared. Check back after the
            next UTC reset.
          </p>
        </section>
      </main>
    );
  }

  const session = await readAnonymousConnectionsSession();
  if (session?.puzzleId === puzzle.id) {
    return (
      <main className="px-3 py-8 sm:px-8 sm:py-12">
        <ConnectionsBoard
          initialState={{
            puzzle: projectAnonymousConnectionsSession(puzzle, session),
            feedback: null,
            error: null,
          }}
          submitSelection={submitAnonymousConnections}
        />
      </main>
    );
  }

  return (
    <main className="px-5 py-12 sm:px-8 sm:py-20">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-muted text-sm font-medium">A shared daily puzzle</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.055em] sm:text-7xl">
          Four groups.
          <br />
          One connection each.
        </h1>
        <p className="text-muted mx-auto mt-6 max-w-xl text-base leading-7 sm:text-lg">
          Sort sixteen Frieren terms into four hidden groups. You have four
          mistakes, and everyone receives the same puzzle each UTC day.
        </p>

        {puzzle.spoilerNote ? (
          <div className="border-gold/45 bg-gold/10 mx-auto mt-8 max-w-lg rounded-lg border px-5 py-4 text-sm">
            <strong>Spoiler scope:</strong> {puzzle.spoilerNote}
          </div>
        ) : null}

        <form action={startAnonymousConnections} className="mt-9">
          <SubmitButton
            pendingLabel="Preparing puzzle…"
            className="bg-foreground text-background min-h-12 px-7 font-semibold transition hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
          >
            Start today&apos;s puzzle
          </SubmitButton>
        </form>
        <p className="text-muted mt-4 text-xs leading-5">
          Anonymous progress is saved in this browser for today.
        </p>
      </section>
    </main>
  );
}
