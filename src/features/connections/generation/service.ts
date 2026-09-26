import { connectionsGenerationCatalog } from "./catalog";
import {
  requestOpenRouterStructuredOutput,
  type OpenRouterStructuredResult,
} from "./openrouter";
import {
  buildConnectionsCriticMessages,
  buildConnectionsGeneratorMessages,
  restoreConnectionsCriticTileIds,
} from "./prompts";
import {
  connectionsCriticBatchJsonSchema,
  connectionsCriticBatchSchema,
  generatedConnectionsBatchJsonSchema,
  generatedConnectionsBatchSchema,
} from "./schemas";
import type {
  ConnectionsCandidateReview,
  ConnectionsSpoilerBoundary,
} from "./types";
import {
  eligibleConnectionsCategories,
  evaluateGeneratedConnectionsCandidate,
  validateConnectionsGenerationCatalog,
  type MaterializedConnectionsCandidate,
} from "./validation";

export const DEFAULT_CONNECTIONS_GENERATOR_MODEL =
  "google/gemini-3.1-flash-lite";
export const DEFAULT_CONNECTIONS_CRITIC_MODEL = "openai/gpt-5-mini";

type UsageResult = Pick<
  OpenRouterStructuredResult<unknown>,
  "servedModel" | "usage"
>;

export type GenerateConnectionsCandidatesResult = {
  candidates: MaterializedConnectionsCandidate[];
  reviews: ConnectionsCandidateReview[];
  rejected: Array<{
    candidateId: string;
    issues: Array<{ path: string; message: string }>;
  }>;
  generator: UsageResult;
  critic: UsageResult;
};

type GenerateConnectionsCandidatesInput = {
  apiKey: string;
  candidateCount: number;
  maximumSpoiler: ConnectionsSpoilerBoundary;
  theme: string;
  generatorModel?: string;
  criticModel?: string;
  onStage?: (stage: "GENERATING" | "CRITIQUING", model: string) => void;
};

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

export async function generateConnectionsCandidates(
  input: GenerateConnectionsCandidatesInput,
): Promise<GenerateConnectionsCandidatesResult> {
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
    input.maximumSpoiler,
  );
  if (categories.length < 4) {
    throw new Error(
      "The requested spoiler boundary leaves fewer than four eligible categories.",
    );
  }

  const generatorModel =
    input.generatorModel || DEFAULT_CONNECTIONS_GENERATOR_MODEL;
  const criticModel = input.criticModel || DEFAULT_CONNECTIONS_CRITIC_MODEL;
  input.onStage?.("GENERATING", generatorModel);
  const generated = await requestOpenRouterStructuredOutput({
    apiKey: input.apiKey,
    model: generatorModel,
    schemaName: "connections_candidates",
    jsonSchema: generatedConnectionsBatchJsonSchema({
      candidateCount: input.candidateCount,
      categoryIds: categories.map((category) => category.id),
    }),
    outputSchema: generatedConnectionsBatchSchema,
    messages: buildConnectionsGeneratorMessages({
      categories,
      candidateCount: input.candidateCount,
      maximumSpoiler: input.maximumSpoiler,
      theme: input.theme,
    }),
    temperature: 0.8,
    maxCompletionTokens: 4_000,
  });
  assertUniqueCandidates(generated.data.candidates);

  const evaluations = generated.data.candidates.map((candidate) =>
    evaluateGeneratedConnectionsCandidate(
      candidate,
      connectionsGenerationCatalog,
      input.maximumSpoiler,
    ),
  );
  const rejected = evaluations
    .filter((candidate) => candidate.issues.length > 0)
    .map((evaluation) => ({
      candidateId: evaluation.candidate.id,
      issues: evaluation.issues,
    }));
  const candidates = evaluations.flatMap((evaluation) =>
    evaluation.issues.length === 0 && evaluation.materialized
      ? [evaluation.materialized]
      : [],
  );
  if (candidates.length === 0) {
    throw new Error(
      "The generator produced no structurally valid candidates. Run it again or improve the catalogue constraints.",
    );
  }

  input.onStage?.("CRITIQUING", criticModel);
  const critiqued = await requestOpenRouterStructuredOutput({
    apiKey: input.apiKey,
    model: criticModel,
    schemaName: "connections_candidate_reviews",
    jsonSchema: connectionsCriticBatchJsonSchema({
      candidateIds: candidates.map((candidate) => candidate.source.id),
    }),
    outputSchema: connectionsCriticBatchSchema,
    messages: buildConnectionsCriticMessages(candidates),
    reasoningEffort: "low",
    maxCompletionTokens: 8_000,
  });
  assertCompleteReviews(candidates, critiqued.data.reviews);

  return {
    candidates,
    reviews: restoreConnectionsCriticTileIds(
      candidates,
      critiqued.data.reviews,
    ),
    rejected,
    generator: {
      servedModel: generated.servedModel,
      usage: generated.usage,
    },
    critic: {
      servedModel: critiqued.servedModel,
      usage: critiqued.usage,
    },
  };
}
