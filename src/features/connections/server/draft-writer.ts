import {
  ConnectionsPuzzleStatus as DbConnectionsPuzzleStatus,
  type Prisma,
} from "../../../generated/prisma/client";
import { startOfUtcDate } from "../../../lib/utc-date";

import { canEditConnectionsPuzzle } from "../domain/puzzle-policy";
import {
  normalizeConnectionsText,
  validateConnectionsPuzzle,
} from "../domain/puzzle";
import type { ConnectionsPuzzle } from "../domain/types";

export type ConnectionsPuzzleDraftInput = {
  dateUtc: Date;
  spoilerNote?: string | null;
  groups: Array<{
    position: number;
    label: string;
    explanation?: string | null;
    tiles: string[];
  }>;
};

export const connectionsPuzzleWithAnswers = {
  groups: {
    orderBy: { position: "asc" as const },
    include: { tiles: { orderBy: { id: "asc" as const } } },
  },
  _count: { select: { attempts: true } },
};

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function cleanOptionalText(value?: string | null): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function validatedDraft(input: ConnectionsPuzzleDraftInput): ConnectionsPuzzle {
  const puzzle: ConnectionsPuzzle = {
    id: "draft",
    spoilerNote: cleanOptionalText(input.spoilerNote),
    groups: input.groups.map((group, groupIndex) => ({
      id: `draft-group-${groupIndex}`,
      position: group.position,
      label: cleanText(group.label),
      explanation: cleanOptionalText(group.explanation),
      tiles: group.tiles.map((text, tileIndex) => ({
        id: `draft-tile-${groupIndex}-${tileIndex}`,
        text: cleanText(text),
      })),
    })),
  };
  const issues = validateConnectionsPuzzle(puzzle);
  if (issues.length > 0) {
    throw new Error(
      issues.map((issue) => `${issue.path}: ${issue.message}`).join(" "),
    );
  }
  return puzzle;
}

export async function writeConnectionsPuzzleDraft(
  database: Prisma.TransactionClient,
  input: ConnectionsPuzzleDraftInput,
  now = new Date(),
) {
  const dateUtc = startOfUtcDate(input.dateUtc);
  const puzzle = validatedDraft({ ...input, dateUtc });
  const existing = await database.connectionsPuzzle.findUnique({
    where: { dateUtc },
    include: connectionsPuzzleWithAnswers,
  });

  if (
    existing &&
    !canEditConnectionsPuzzle(existing.dateUtc, existing.status, now)
  ) {
    throw new Error(
      "Only future draft puzzles can be edited. Return an approved future puzzle to draft first.",
    );
  }
  if (!existing && dateUtc <= startOfUtcDate(now)) {
    throw new Error(
      "Connections puzzles can only be created for future UTC dates.",
    );
  }

  const stored = existing
    ? await database.connectionsPuzzle.update({
        where: { id: existing.id },
        data: { spoilerNote: puzzle.spoilerNote },
      })
    : await database.connectionsPuzzle.create({
        data: {
          dateUtc,
          spoilerNote: puzzle.spoilerNote,
          status: DbConnectionsPuzzleStatus.DRAFT,
        },
      });

  if (existing) {
    await database.connectionsGroup.deleteMany({
      where: { puzzleId: stored.id },
    });
  }

  for (const group of puzzle.groups) {
    await database.connectionsGroup.create({
      data: {
        puzzle: { connect: { id: stored.id } },
        position: group.position,
        label: group.label,
        explanation: group.explanation,
        tiles: {
          create: group.tiles.map((tile) => ({
            text: tile.text,
            normalizedText: normalizeConnectionsText(tile.text),
          })),
        },
      },
    });
  }

  return database.connectionsPuzzle.findUniqueOrThrow({
    where: { id: stored.id },
    include: connectionsPuzzleWithAnswers,
  });
}
