import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";

import { PrismaPg } from "@prisma/adapter-pg";

import type { ConnectionsCandidateReview } from "../../src/features/connections/generation/types";
import type { MaterializedConnectionsCandidate } from "../../src/features/connections/generation/validation";
import { writeConnectionsPuzzleDraft } from "../../src/features/connections/server/draft-writer";
import {
  ConnectionsPuzzleStatus,
  PrismaClient,
} from "../../src/generated/prisma/client";
import { parseUtcDateKey } from "../../src/lib/utc-date";
import { candidateToDraftInput, parseCandidateSelection } from "./draft";

type SaveGeneratedDraftInput = {
  dateKey: string;
  candidates: MaterializedConnectionsCandidate[];
  reviewsByCandidate: Map<string, ConnectionsCandidateReview>;
};

async function askForCandidate(
  question: (prompt: string) => Promise<string>,
  candidateCount: number,
): Promise<number | null> {
  while (true) {
    try {
      return parseCandidateSelection(
        await question(
          `Select a candidate to save [1-${candidateCount}, 0 cancels]: `,
        ),
        candidateCount,
      );
    } catch (error) {
      console.warn(error instanceof Error ? error.message : error);
    }
  }
}

export async function promptToSaveConnectionsDraft(
  saveInput: SaveGeneratedDraftInput,
): Promise<void> {
  if (!input.isTTY || !output.isTTY) {
    throw new Error("--save-date requires an interactive terminal.");
  }

  console.log(`\nDraft candidates for ${saveInput.dateKey}:`);
  saveInput.candidates.forEach((candidate, index) => {
    const review = saveInput.reviewsByCandidate.get(candidate.source.id);
    console.log(
      `${index + 1}. ${candidate.source.id} — ${review?.recommendation ?? "UNREVIEWED"}, fairness ${review?.fairnessScore ?? "?"}/10`,
    );
  });

  const readline = createInterface({ input, output });
  try {
    const selectedIndex = await askForCandidate(
      (prompt) => readline.question(prompt),
      saveInput.candidates.length,
    );
    if (selectedIndex === null) {
      console.log("Draft save cancelled.");
      return;
    }

    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error("DATABASE_URL is required to save a Connections draft.");
    }

    const dateUtc = parseUtcDateKey(saveInput.dateKey);
    const selected = saveInput.candidates[selectedIndex];
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });

    try {
      const existing = await prisma.connectionsPuzzle.findUnique({
        where: { dateUtc },
        select: { status: true },
      });
      if (existing?.status !== undefined) {
        if (existing.status !== ConnectionsPuzzleStatus.DRAFT) {
          throw new Error(
            `The ${saveInput.dateKey} puzzle is ${existing.status} and cannot be replaced by this tool.`,
          );
        }
        const confirmation = await readline.question(
          `${saveInput.dateKey} already has a draft. Type REPLACE to overwrite it: `,
        );
        if (confirmation.trim() !== "REPLACE") {
          console.log(
            "Draft save cancelled; the existing puzzle was not changed.",
          );
          return;
        }
      }

      const stored = await prisma.$transaction(
        (database) =>
          writeConnectionsPuzzleDraft(
            database,
            candidateToDraftInput(selected, dateUtc),
          ),
        { isolationLevel: "Serializable" },
      );
      console.log(
        `Saved ${selected.source.id} as DRAFT ${stored.id} for ${saveInput.dateKey}.`,
      );
      console.log(
        `Review it at /admin/connections?month=${saveInput.dateKey.slice(0, 7)}&date=${saveInput.dateKey}`,
      );
    } finally {
      await prisma.$disconnect();
    }
  } finally {
    readline.close();
  }
}
