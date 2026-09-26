import { describe, expect, it } from "vitest";

import { connectionsGenerationCatalog } from "./catalog";
import type {
  ConnectionsCatalogCategory,
  GeneratedConnectionsCandidate,
} from "./types";
import {
  eligibleConnectionsCategories,
  evaluateGeneratedConnectionsCandidate,
} from "./validation";

const maximumSpoiler = { season: 1, episode: 28 };

function candidate(categoryIds: string[]): GeneratedConnectionsCandidate {
  return {
    id: "candidate-one",
    theme: "Characters",
    categoryIds,
    constructionNotes: "A test candidate.",
  };
}

describe("generated Connections candidate validation", () => {
  it("materializes a valid candidate through the existing puzzle validator", () => {
    const result = evaluateGeneratedConnectionsCandidate(
      candidate([
        "hero-party",
        "aura-forces",
        "exam-final-passers",
        "exam-officials",
      ]),
      connectionsGenerationCatalog,
      maximumSpoiler,
    );

    expect(result.issues).toEqual([]);
    expect(result.materialized?.puzzle.groups).toHaveLength(4);
    expect(
      result.materialized?.puzzle.groups.flatMap((group) => group.tiles),
    ).toHaveLength(16);
    expect(
      result.materialized?.nearMatches.map((match) => match.categoryId),
    ).toEqual(expect.arrayContaining(["german-verbs", "german-adjectives"]));
  });

  it("rejects categories outside the requested spoiler boundary", () => {
    const result = evaluateGeneratedConnectionsCandidate(
      candidate([
        "hero-party",
        "aura-forces",
        "exam-final-passers",
        "exam-officials",
      ]),
      connectionsGenerationCatalog,
      { season: 1, episode: 14 },
    );

    expect(result.materialized).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("outside the spoiler boundary"),
        }),
      ]),
    );
  });

  it("rejects selected groups that repeat a tile", () => {
    const result = evaluateGeneratedConnectionsCandidate(
      candidate([
        "hero-party",
        "german-verbs",
        "aura-forces",
        "exam-officials",
      ]),
      connectionsGenerationCatalog,
      maximumSpoiler,
    );

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Tile IDs must be unique within a puzzle.",
        }),
      ]),
    );
  });

  it("detects an unintended complete category across selected groups", () => {
    const crossGroup: ConnectionsCatalogCategory = {
      id: "cross-group",
      label: "Unintended cross-group",
      explanation: "One tile from each intended group.",
      spoilerThrough: maximumSpoiler,
      sourceNote: "Synthetic test category.",
      tags: ["test"],
      tiles: [
        { id: "frieren", text: "Frieren", kind: "CHARACTER" },
        { id: "aura", text: "Aura", kind: "CHARACTER" },
        { id: "fern", text: "Fern", kind: "CHARACTER" },
        { id: "genau", text: "Genau", kind: "CHARACTER" },
      ],
    };
    const result = evaluateGeneratedConnectionsCandidate(
      candidate([
        "hero-party",
        "aura-forces",
        "exam-final-passers",
        "exam-officials",
      ]),
      {
        ...connectionsGenerationCatalog,
        categories: [...connectionsGenerationCatalog.categories, crossGroup],
      },
      maximumSpoiler,
    );

    expect(result.materialized?.alternateGroups).toEqual([
      expect.objectContaining({ categoryId: "cross-group" }),
    ]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("unintended complete category"),
      }),
    ]);
  });

  it("filters catalogue categories by anime spoiler boundary", () => {
    expect(
      eligibleConnectionsCategories(connectionsGenerationCatalog, {
        season: 1,
        episode: 10,
      }).map((category) => category.id),
    ).toEqual(["hero-party", "aura-forces", "demon-magic"]);
  });
});
