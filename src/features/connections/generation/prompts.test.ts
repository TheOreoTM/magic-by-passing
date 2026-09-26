import { describe, expect, it } from "vitest";

import { buildConnectionsCriticMessages } from "./prompts";
import type { MaterializedConnectionsCandidate } from "./validation";

describe("Connections critic prompt", () => {
  it("distinguishes internal IDs from player-facing text and candidates", () => {
    const messages = buildConnectionsCriticMessages([
      {
        source: {
          id: "candidate-one",
          theme: "Names",
          categoryIds: [],
          constructionNotes: "Test candidate",
        },
        puzzle: { id: "generated", spoilerNote: null, groups: [] },
        categories: [],
        spoilerThrough: { season: 1, episode: 1 },
        alternateGroups: [],
        nearMatches: [],
      } satisfies MaterializedConnectionsCandidate,
    ]);

    expect(messages[0].content).toContain(
      "Review each candidate as an independent board.",
    );
    expect(messages[0].content).toContain(
      "IDs are normalized internal identifiers",
    );
    expect(messages[0].content).toContain(
      "tileIds must contain only tile IDs from that same candidate",
    );
  });
});
