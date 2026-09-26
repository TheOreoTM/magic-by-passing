import { describe, expect, it } from "vitest";

import {
  buildConnectionsCriticMessages,
  restoreConnectionsCriticTileIds,
} from "./prompts";
import type { MaterializedConnectionsCandidate } from "./validation";

describe("Connections critic prompt", () => {
  it("distinguishes internal IDs from player-facing text and candidates", () => {
    const candidate = {
      source: {
        id: "candidate-one",
        theme: "Names",
        categoryIds: ["german-adjectives"],
        constructionNotes: "Test candidate",
      },
      puzzle: {
        id: "generated",
        spoilerNote: null,
        groups: [
          {
            id: "german-adjectives",
            position: 1,
            label: "German adjectives",
            explanation: null,
            tiles: [{ id: "ubel", text: "Übel" }],
          },
        ],
      },
      categories: [
        {
          id: "german-adjectives",
          label: "German adjectives",
          explanation: "Names used as adjectives.",
          spoilerThrough: { season: 1, episode: 1 },
          sourceNote: "Localization review required.",
          tags: ["language"],
          tiles: [{ id: "ubel", text: "Übel", kind: "CHARACTER" }],
        },
      ],
      spoilerThrough: { season: 1, episode: 1 },
      alternateGroups: [],
      nearMatches: [
        {
          categoryId: "near-match",
          label: "Near match",
          matchingTileIds: ["ubel"],
        },
      ],
    } satisfies MaterializedConnectionsCandidate;
    const messages = buildConnectionsCriticMessages([candidate]);

    expect(messages[0].content).toContain(
      "Review each candidate as an independent board.",
    );
    expect(messages[0].content).toContain("temporary opaque aliases");
    expect(messages[0].content).toContain(
      "tileIds must contain only tile aliases from that same candidate",
    );
    expect(messages[1].content).toContain('"id": "tile-1"');
    expect(messages[1].content).toContain('"text": "Übel"');
    expect(messages[1].content).not.toContain('"id": "ubel"');
    const payload = JSON.parse(messages[1].content);
    expect(payload[0].deterministicNearMatches[0].matchingTileIds).toEqual([
      "tile-1",
    ]);

    const restored = restoreConnectionsCriticTileIds(
      [candidate],
      [
        {
          candidateId: "candidate-one",
          fairnessScore: 5,
          recommendation: "REVISE",
          strengths: [],
          issues: [
            {
              severity: "LOW",
              type: "SPELLING_OR_LOCALIZATION",
              tileIds: ["tile-1"],
              explanation: "Check tile-1 player-facing spelling.",
            },
          ],
        },
      ],
    );
    expect(restored[0].issues[0].tileIds).toEqual(["ubel"]);
    expect(restored[0].issues[0].explanation).toBe(
      "Check Übel player-facing spelling.",
    );
  });
});
