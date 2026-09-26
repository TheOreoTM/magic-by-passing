import { deterministicShuffle } from "../../src/features/connections/domain/shuffle";
import {
  DEFAULT_CONNECTIONS_CRITIC_MODEL,
  DEFAULT_CONNECTIONS_GENERATOR_MODEL,
  generateConnectionsCandidates,
} from "../../src/features/connections/generation/service";
import type { ConnectionsCandidateReview } from "../../src/features/connections/generation/types";
import type { MaterializedConnectionsCandidate } from "../../src/features/connections/generation/validation";
import { parseUtcDateKey, startOfUtcDate } from "../../src/lib/utc-date";
import { parseConnectionsGeneratorOptions } from "./options";
import { promptToSaveConnectionsDraft } from "./save-draft";

function usageLine(input: {
  servedModel?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
}): string {
  const details = [
    input.servedModel ? `model ${input.servedModel}` : undefined,
    input.usage?.prompt_tokens !== undefined
      ? `${input.usage.prompt_tokens} input tokens`
      : undefined,
    input.usage?.completion_tokens !== undefined
      ? `${input.usage.completion_tokens} output tokens`
      : undefined,
    input.usage?.cost !== undefined
      ? `$${input.usage.cost.toFixed(4)}`
      : undefined,
  ].filter(Boolean);
  return details.length > 0 ? details.join(", ") : "usage unavailable";
}

function printCandidate(
  candidate: MaterializedConnectionsCandidate,
  review: ConnectionsCandidateReview,
): void {
  const shuffledTiles = deterministicShuffle(
    candidate.puzzle.groups.flatMap((group) => group.tiles),
    candidate.source.id,
  );

  console.log(`\n## ${candidate.source.id}: ${candidate.source.theme}`);
  console.log(
    `Review: ${review.recommendation}, fairness ${review.fairnessScore}/10`,
  );
  console.log(
    `Spoilers: Season ${candidate.spoilerThrough.season} through episode ${candidate.spoilerThrough.episode}`,
  );
  console.log(`Construction: ${candidate.source.constructionNotes}`);
  console.log("\nShuffled board:");
  for (let index = 0; index < shuffledTiles.length; index += 4) {
    console.log(
      shuffledTiles
        .slice(index, index + 4)
        .map((tile) => tile.text)
        .join(" | "),
    );
  }

  console.log("\nSolutions:");
  for (const category of candidate.categories) {
    console.log(
      `- ${category.label}: ${category.tiles.map((tile) => tile.text).join(", ")}`,
    );
  }

  if (candidate.nearMatches.length > 0) {
    console.log("\nDeterministic three-of-four overlaps:");
    for (const match of candidate.nearMatches) {
      console.log(`- ${match.label}: ${match.matchingTileIds.join(", ")}`);
    }
  }

  if (review.strengths.length > 0) {
    console.log("\nCritic strengths:");
    for (const strength of review.strengths) console.log(`- ${strength}`);
  }
  if (review.issues.length > 0) {
    console.log("\nCritic issues:");
    for (const issue of review.issues) {
      const tiles =
        issue.tileIds.length > 0 ? ` [${issue.tileIds.join(", ")}]` : "";
      console.log(
        `- ${issue.severity} ${issue.type}${tiles}: ${issue.explanation}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const options = parseConnectionsGeneratorOptions(process.argv.slice(2));
  if (
    options.saveDate &&
    parseUtcDateKey(options.saveDate) <= startOfUtcDate(new Date())
  ) {
    throw new Error("--save-date must be a future UTC date.");
  }
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is required. Add it to .env.local before generating boards.",
    );
  }

  const generatorModel =
    process.env.CONNECTIONS_GENERATOR_MODEL?.trim() ||
    DEFAULT_CONNECTIONS_GENERATOR_MODEL;
  const criticModel =
    process.env.CONNECTIONS_CRITIC_MODEL?.trim() ||
    DEFAULT_CONNECTIONS_CRITIC_MODEL;
  const result = await generateConnectionsCandidates({
    apiKey,
    candidateCount: options.candidateCount,
    maximumSpoiler: options.maximumSpoiler,
    theme: options.theme,
    generatorModel,
    criticModel,
    onStage(stage, model) {
      console.log(
        stage === "GENERATING"
          ? `Generating ${options.candidateCount} candidate(s) with ${model}...`
          : `\nCritiquing valid candidate(s) with ${model}...`,
      );
    },
  });

  console.log(`Generator usage: ${usageLine(result.generator)}`);
  for (const rejected of result.rejected) {
    console.warn(`\nRejected ${rejected.candidateId}:`);
    for (const issue of rejected.issues) {
      console.warn(`- ${issue.path}: ${issue.message}`);
    }
  }
  console.log(`Critic usage: ${usageLine(result.critic)}`);

  const reviewsByCandidate = new Map(
    result.reviews.map((review) => [review.candidateId, review]),
  );
  for (const candidate of result.candidates) {
    printCandidate(candidate, reviewsByCandidate.get(candidate.source.id)!);
  }

  console.log(
    "\nThese are untrusted authoring drafts. Canon, localization, ambiguity, spoiler scope, and mobile layout still require human review before approving a Connections puzzle.",
  );

  if (options.saveDate) {
    await promptToSaveConnectionsDraft({
      dateKey: options.saveDate,
      candidates: result.candidates,
      reviewsByCandidate,
    });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
