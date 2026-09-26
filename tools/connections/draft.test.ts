import { describe, expect, it } from "vitest";

import type { MaterializedConnectionsCandidate } from "../../src/features/connections/generation/validation";
import { candidateToDraftInput, parseCandidateSelection } from "./draft";

const candidate = {
  source: {
    id: "candidate-one",
    theme: "Magic",
    categoryIds: ["one"],
    constructionNotes: "Notes",
  },
  puzzle: {
    id: "generated-candidate-one",
    spoilerNote: "Season 1 through episode 12.",
    groups: [
      {
        id: "group-one",
        position: 1,
        label: "Magic",
        explanation: "A magic group.",
        tiles: [
          { id: "warm-tea", text: "Warm tea" },
          { id: "sour-grapes", text: "Sour grapes" },
        ],
      },
    ],
  },
  categories: [],
  spoilerThrough: { season: 1, episode: 12 },
  alternateGroups: [],
  nearMatches: [],
} satisfies MaterializedConnectionsCandidate;

describe("Connections generated draft selection", () => {
  it("maps player-facing puzzle text to the shared draft input", () => {
    const dateUtc = new Date("2026-10-01T00:00:00.000Z");

    expect(candidateToDraftInput(candidate, dateUtc)).toEqual({
      dateUtc,
      spoilerNote: "Season 1 through episode 12.",
      groups: [
        {
          position: 1,
          label: "Magic",
          explanation: "A magic group.",
          tiles: ["Warm tea", "Sour grapes"],
        },
      ],
    });
  });

  it("accepts a numbered choice or cancellation", () => {
    expect(parseCandidateSelection("2", 3)).toBe(1);
    expect(parseCandidateSelection("0", 3)).toBeNull();
    expect(parseCandidateSelection("cancel", 3)).toBeNull();
    expect(() => parseCandidateSelection("4", 3)).toThrow(
      "Choose a candidate from 1 to 3, or 0 to cancel.",
    );
  });
});
