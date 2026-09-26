import { describe, expect, it, vi } from "vitest";

import type { Prisma } from "../../../generated/prisma/client";

import { writeConnectionsPuzzleDraft } from "./draft-writer";

describe("Connections draft writer", () => {
  it("uses nested Prisma relations without manually supplying puzzleId", async () => {
    const createPuzzle = vi.fn(async () => ({ id: "puzzle-one" }));
    const createGroup = vi.fn(async (input: unknown) => {
      void input;
      return {};
    });
    const storedPuzzle = { id: "puzzle-one", status: "DRAFT" };
    const database = {
      connectionsPuzzle: {
        findUnique: vi.fn(async () => null),
        create: createPuzzle,
        findUniqueOrThrow: vi.fn(async () => storedPuzzle),
      },
      connectionsGroup: {
        create: createGroup,
        deleteMany: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient;

    const result = await writeConnectionsPuzzleDraft(
      database,
      {
        dateUtc: new Date("2026-10-01T00:00:00.000Z"),
        spoilerNote: "Through season 1",
        groups: Array.from({ length: 4 }, (_, groupIndex) => ({
          position: groupIndex + 1,
          label: `Group ${groupIndex + 1}`,
          explanation: `Explanation ${groupIndex + 1}`,
          tiles: Array.from(
            { length: 4 },
            (_, tileIndex) => `Tile ${groupIndex + 1}-${tileIndex + 1}`,
          ),
        })),
      },
      new Date("2026-09-26T12:00:00.000Z"),
    );

    expect(result).toBe(storedPuzzle);
    expect(createPuzzle).toHaveBeenCalledWith({
      data: {
        dateUtc: new Date("2026-10-01T00:00:00.000Z"),
        spoilerNote: "Through season 1",
        status: "DRAFT",
      },
    });
    expect(createGroup).toHaveBeenCalledTimes(4);

    const firstGroupData = (
      createGroup.mock.calls[0]?.[0] as {
        data: {
          puzzle?: unknown;
          puzzleId?: string;
          position: number;
          label: string;
          tiles: { create: Array<Record<string, unknown>> };
        };
      }
    ).data;
    expect(firstGroupData).toMatchObject({
      puzzle: { connect: { id: "puzzle-one" } },
      position: 1,
      label: "Group 1",
      tiles: {
        create: [
          { text: "Tile 1-1", normalizedText: "tile 1-1" },
          { text: "Tile 1-2", normalizedText: "tile 1-2" },
          { text: "Tile 1-3", normalizedText: "tile 1-3" },
          { text: "Tile 1-4", normalizedText: "tile 1-4" },
        ],
      },
    });
    expect(firstGroupData).not.toHaveProperty("puzzleId");
    for (const tile of firstGroupData.tiles.create) {
      expect(tile).not.toHaveProperty("puzzleId");
    }
  });
});
