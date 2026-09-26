import type { ConnectionsPuzzleDraftInput } from "../../src/features/connections/server/draft-writer";
import type { MaterializedConnectionsCandidate } from "../../src/features/connections/generation/validation";

export function candidateToDraftInput(
  candidate: MaterializedConnectionsCandidate,
  dateUtc: Date,
): ConnectionsPuzzleDraftInput {
  return {
    dateUtc,
    spoilerNote: candidate.puzzle.spoilerNote,
    groups: candidate.puzzle.groups.map((group) => ({
      position: group.position,
      label: group.label,
      explanation: group.explanation,
      tiles: group.tiles.map((tile) => tile.text),
    })),
  };
}

export function parseCandidateSelection(
  value: string,
  candidateCount: number,
): number | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "0" || normalized === "cancel") return null;

  const selection = Number(normalized);
  if (
    !Number.isInteger(selection) ||
    selection < 1 ||
    selection > candidateCount
  ) {
    throw new Error(
      `Choose a candidate from 1 to ${candidateCount}, or 0 to cancel.`,
    );
  }
  return selection - 1;
}
