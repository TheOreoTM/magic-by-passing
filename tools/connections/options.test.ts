import { describe, expect, it } from "vitest";

import { parseConnectionsGeneratorOptions } from "./options";

describe("Connections generator options", () => {
  it("uses conservative defaults", () => {
    expect(parseConnectionsGeneratorOptions([])).toEqual({
      candidateCount: 3,
      maximumSpoiler: { season: 1, episode: 28 },
      theme: "mixed",
    });
  });

  it("parses candidate, spoiler, and theme options", () => {
    expect(
      parseConnectionsGeneratorOptions([
        "--count",
        "2",
        "--season",
        "1",
        "--episode",
        "14",
        "--theme",
        "magic",
      ]),
    ).toEqual({
      candidateCount: 2,
      maximumSpoiler: { season: 1, episode: 14 },
      theme: "magic",
    });
  });

  it("rejects excessive candidate counts", () => {
    expect(() => parseConnectionsGeneratorOptions(["--count", "6"])).toThrow(
      "--count cannot be greater than 5.",
    );
  });
});
