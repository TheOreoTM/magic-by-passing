import "server-only";

import {
  ConnectionsPuzzleStatus as DbConnectionsPuzzleStatus,
  type Prisma,
} from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { startOfUtcDate, utcDateKey } from "@/lib/utc-date";

import {
  canApproveConnectionsPuzzle,
  canEditConnectionsPuzzle,
  canReturnConnectionsPuzzleToDraft,
  connectionsPuzzleDisplayState,
} from "../domain/puzzle-policy";
import { validateConnectionsPuzzle } from "../domain/puzzle";
import type { ConnectionsPuzzle } from "../domain/types";
import {
  connectionsPuzzleWithAnswers as puzzleWithAnswers,
  writeConnectionsPuzzleDraft,
  type ConnectionsPuzzleDraftInput,
} from "./draft-writer";

export type { ConnectionsPuzzleDraftInput } from "./draft-writer";

type StoredConnectionsPuzzle = Prisma.ConnectionsPuzzleGetPayload<{
  include: typeof puzzleWithAnswers;
}>;

function storedPuzzleToDomain(
  puzzle: StoredConnectionsPuzzle,
): ConnectionsPuzzle {
  return {
    id: puzzle.id,
    spoilerNote: puzzle.spoilerNote,
    groups: puzzle.groups.map((group) => ({
      id: group.id,
      position: group.position,
      label: group.label,
      explanation: group.explanation,
      tiles: group.tiles.map((tile) => ({ id: tile.id, text: tile.text })),
    })),
  };
}

function assertValidStoredPuzzle(puzzle: StoredConnectionsPuzzle): void {
  const issues = validateConnectionsPuzzle(storedPuzzleToDomain(puzzle));
  if (issues.length > 0) {
    throw new Error(
      `Puzzle is not ready to approve. ${issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join(" ")}`,
    );
  }
}

export async function saveConnectionsPuzzleDraft(
  input: ConnectionsPuzzleDraftInput,
  now = new Date(),
) {
  return getDb().$transaction(
    (database) => writeConnectionsPuzzleDraft(database, input, now),
    { isolationLevel: "Serializable" },
  );
}

export async function approveConnectionsPuzzle(
  puzzleId: string,
  now = new Date(),
) {
  return getDb().$transaction(async (database) => {
    const puzzle = await database.connectionsPuzzle.findUnique({
      where: { id: puzzleId },
      include: puzzleWithAnswers,
    });
    if (
      !puzzle ||
      !canApproveConnectionsPuzzle(puzzle.dateUtc, puzzle.status, now)
    ) {
      throw new Error("Only future draft puzzles can be approved.");
    }

    assertValidStoredPuzzle(puzzle);
    return database.connectionsPuzzle.update({
      where: { id: puzzle.id },
      data: {
        status: DbConnectionsPuzzleStatus.APPROVED,
        approvedAt: now,
        voidedAt: null,
      },
    });
  });
}

export async function returnConnectionsPuzzleToDraft(
  puzzleId: string,
  now = new Date(),
) {
  return getDb().$transaction(async (database) => {
    const puzzle = await database.connectionsPuzzle.findUnique({
      where: { id: puzzleId },
      select: { id: true, dateUtc: true, status: true },
    });
    if (
      !puzzle ||
      !canReturnConnectionsPuzzleToDraft(puzzle.dateUtc, puzzle.status, now)
    ) {
      throw new Error("Only future approved puzzles can be returned to draft.");
    }

    return database.connectionsPuzzle.update({
      where: { id: puzzle.id },
      data: {
        status: DbConnectionsPuzzleStatus.DRAFT,
        approvedAt: null,
      },
    });
  });
}

export async function voidConnectionsPuzzle(
  puzzleId: string,
  now = new Date(),
) {
  return getDb().$transaction(async (database) => {
    const puzzle = await database.connectionsPuzzle.findUnique({
      where: { id: puzzleId },
      select: { id: true, status: true },
    });
    if (!puzzle || puzzle.status === DbConnectionsPuzzleStatus.VOID) {
      throw new Error("This Connections puzzle cannot be voided.");
    }

    return database.connectionsPuzzle.update({
      where: { id: puzzle.id },
      data: {
        status: DbConnectionsPuzzleStatus.VOID,
        voidedAt: now,
      },
    });
  });
}

export async function listAdminConnectionsPuzzles(
  firstDate: Date,
  lastDate: Date,
  now = new Date(),
) {
  const puzzles = await getDb().connectionsPuzzle.findMany({
    where: {
      dateUtc: {
        gte: startOfUtcDate(firstDate),
        lte: startOfUtcDate(lastDate),
      },
    },
    orderBy: { dateUtc: "asc" },
    include: puzzleWithAnswers,
  });

  return puzzles.map((puzzle) => ({
    ...puzzle,
    dateKey: utcDateKey(puzzle.dateUtc),
    displayState: connectionsPuzzleDisplayState(
      puzzle.dateUtc,
      puzzle.status,
      now,
    ),
    editable: canEditConnectionsPuzzle(puzzle.dateUtc, puzzle.status, now),
    canReturnToDraft: canReturnConnectionsPuzzleToDraft(
      puzzle.dateUtc,
      puzzle.status,
      now,
    ),
    domainPuzzle: storedPuzzleToDomain(puzzle),
  }));
}
