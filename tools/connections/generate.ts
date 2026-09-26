import { deterministicShuffle } from "../../src/features/connections/domain/shuffle";
import { connectionsGenerationCatalog } from "../../src/features/connections/generation/catalog";
import {
  buildConnectionsCriticMessages,
  buildConnectionsGeneratorMessages,
  restoreConnectionsCriticTileIds,
} from "../../src/features/connections/generation/prompts";
import {
  connectionsCriticBatchJsonSchema,
  connectionsCriticBatchSchema,
  generatedConnectionsBatchJsonSchema,
  generatedConnectionsBatchSchema,
} from "../../src/features/connections/generation/schemas";
import type { ConnectionsCandidateReview } from "../../src/features/connections/generation/types";
import {
  eligibleConnectionsCategories,
  evaluateGeneratedConnectionsCandidate,
  validateConnectionsGenerationCatalog,
  type MaterializedConnectionsCandidate,
} from "../../src/features/connections/generation/validation";
import { parseUtcDateKey, startOfUtcDate } from "../../src/lib/utc-date";
import { requestOpenRouterStructuredOutput } from "./openrouter";
import { parseConnectionsGeneratorOptions } from "./options";
import { promptToSaveConnectionsDraft } from "./save-draft";

const DEFAULT_GENERATOR_MODEL = "google/gemini-3.1-flash-lite";
const DEFAULT_CRITIC_MODEL = "openai/gpt-5-mini";

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

function assertUniqueCandidates(
  candidates: Array<{ id: string; categoryIds: string[] }>,
): void {
  const ids = new Set<string>();
  const signatures = new Set<string>();
  for (const candidate of candidates) {
    if (ids.has(candidate.id)) {
      throw new Error(`The generator repeated candidate ID ${candidate.id}.`);
    }
    ids.add(candidate.id);

    const signature = [...candidate.categoryIds].sort().join("|");
    if (signatures.has(signature)) {
      throw new Error("The generator returned the same board more than once.");
    }
    signatures.add(signature);
  }
}

function assertCompleteReviews(
  candidates: MaterializedConnectionsCandidate[],
  reviews: ConnectionsCandidateReview[],
): void {
  const expectedIds = new Set(
    candidates.map((candidate) => candidate.source.id),
  );
  const reviewedIds = new Set<string>();
  for (const review of reviews) {
    if (!expectedIds.has(review.candidateId)) {
      throw new Error(
        `The critic reviewed unknown candidate ${review.candidateId}.`,
      );
    }
    if (reviewedIds.has(review.candidateId)) {
      throw new Error(
        `The critic reviewed candidate ${review.candidateId} more than once.`,
      );
    }
    reviewedIds.add(review.candidateId);
  }
  for (const candidateId of expectedIds) {
    if (!reviewedIds.has(candidateId)) {
      throw new Error(`The critic omitted candidate ${candidateId}.`);
    }
  }
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

  const catalogIssues = validateConnectionsGenerationCatalog(
    connectionsGenerationCatalog,
  );
  if (catalogIssues.length > 0) {
    throw new Error(
      `The Connections generation catalogue is invalid:\n${catalogIssues
        .map((issue) => `- ${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }

  const categories = eligibleConnectionsCategories(
    connectionsGenerationCatalog,
    options.maximumSpoiler,
  );
  if (categories.length < 4) {
    throw new Error(
      "The requested spoiler boundary leaves fewer than four eligible categories.",
    );
  }

  const generatorModel =
    process.env.CONNECTIONS_GENERATOR_MODEL?.trim() || DEFAULT_GENERATOR_MODEL;
  const criticModel =
    process.env.CONNECTIONS_CRITIC_MODEL?.trim() || DEFAULT_CRITIC_MODEL;

  console.log(
    `Generating ${options.candidateCount} candidate(s) with ${generatorModel}...`,
  );
  const generated = await requestOpenRouterStructuredOutput({
    apiKey,
    model: generatorModel,
    schemaName: "connections_candidates",
    jsonSchema: generatedConnectionsBatchJsonSchema({
      candidateCount: options.candidateCount,
      categoryIds: categories.map((category) => category.id),
    }),
    outputSchema: generatedConnectionsBatchSchema,
    messages: buildConnectionsGeneratorMessages({
      categories,
      candidateCount: options.candidateCount,
      maximumSpoiler: options.maximumSpoiler,
      theme: options.theme,
    }),
    temperature: 0.8,
    maxCompletionTokens: 4_000,
  });
  assertUniqueCandidates(generated.data.candidates);
  console.log(`Generator usage: ${usageLine(generated)}`);

  const evaluations = generated.data.candidates.map((candidate) =>
    evaluateGeneratedConnectionsCandidate(
      candidate,
      connectionsGenerationCatalog,
      options.maximumSpoiler,
    ),
  );
  for (const evaluation of evaluations.filter(
    (candidate) => candidate.issues.length > 0,
  )) {
    console.warn(`\nRejected ${evaluation.candidate.id}:`);
    for (const issue of evaluation.issues) {
      console.warn(`- ${issue.path}: ${issue.message}`);
    }
  }

  const validCandidates = evaluations.flatMap((evaluation) =>
    evaluation.issues.length === 0 && evaluation.materialized
      ? [evaluation.materialized]
      : [],
  );
  if (validCandidates.length === 0) {
    throw new Error(
      "The generator produced no structurally valid candidates. Run it again or improve the catalogue constraints.",
    );
  }

  console.log(
    `\nCritiquing ${validCandidates.length} valid candidate(s) with ${criticModel}...`,
  );
  const critiqued = await requestOpenRouterStructuredOutput({
    apiKey,
    model: criticModel,
    schemaName: "connections_candidate_reviews",
    jsonSchema: connectionsCriticBatchJsonSchema({
      candidateIds: validCandidates.map((candidate) => candidate.source.id),
    }),
    outputSchema: connectionsCriticBatchSchema,
    messages: buildConnectionsCriticMessages(validCandidates),
    reasoningEffort: "low",
    maxCompletionTokens: 8_000,
  });
  assertCompleteReviews(validCandidates, critiqued.data.reviews);
  const reviews = restoreConnectionsCriticTileIds(
    validCandidates,
    critiqued.data.reviews,
  );
  console.log(`Critic usage: ${usageLine(critiqued)}`);

  const reviewsByCandidate = new Map(
    reviews.map((review) => [review.candidateId, review]),
  );
  for (const candidate of validCandidates) {
    printCandidate(candidate, reviewsByCandidate.get(candidate.source.id)!);
  }

  console.log(
    "\nThese are untrusted authoring drafts. Canon, localization, ambiguity, spoiler scope, and mobile layout still require human review before approving a Connections puzzle.",
  );

  if (options.saveDate) {
    await promptToSaveConnectionsDraft({
      dateKey: options.saveDate,
      candidates: validCandidates,
      reviewsByCandidate,
    });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
