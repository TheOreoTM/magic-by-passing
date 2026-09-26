import { parseArgs } from "node:util";

import { parseUtcDateKey } from "../../src/lib/utc-date";

export type ConnectionsGeneratorOptions = {
  candidateCount: number;
  maximumSpoiler: { season: number; episode: number };
  theme: string;
  saveDate?: string;
};

function positiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function parseConnectionsGeneratorOptions(
  args: readonly string[],
): ConnectionsGeneratorOptions {
  const { values } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: {
      count: { type: "string", default: "3" },
      season: { type: "string", default: "1" },
      episode: { type: "string", default: "28" },
      theme: { type: "string", default: "mixed" },
      "save-date": { type: "string" },
    },
  });

  const candidateCount = positiveInteger(values.count, "--count");
  if (candidateCount > 5) throw new Error("--count cannot be greater than 5.");

  const theme = values.theme.trim();
  if (!theme) throw new Error("--theme cannot be empty.");

  const saveDate = values["save-date"]?.trim();
  if (saveDate) parseUtcDateKey(saveDate);

  return {
    candidateCount,
    maximumSpoiler: {
      season: positiveInteger(values.season, "--season"),
      episode: positiveInteger(values.episode, "--episode"),
    },
    theme,
    ...(saveDate ? { saveDate } : {}),
  };
}
