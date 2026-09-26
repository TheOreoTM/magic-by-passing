"use server";

import { z } from "zod";

import { deterministicShuffle } from "@/features/connections/domain/shuffle";
import {
  DEFAULT_CONNECTIONS_CRITIC_MODEL,
  DEFAULT_CONNECTIONS_GENERATOR_MODEL,
  generateConnectionsCandidates,
} from "@/features/connections/generation/service";
import { requireAdmin } from "@/lib/authorization";

import type { ConnectionsAiGeneratorState } from "./ai-types";

const generationInputSchema = z.object({
  candidateCount: z.coerce.number().int().min(1).max(3),
  theme: z.string().trim().min(1).max(120),
  season: z.coerce.number().int().min(1).max(20),
  episode: z.coerce.number().int().min(1).max(1_000),
});

function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "The generation form is invalid.";
  }
  return error instanceof Error
    ? error.message
    : "Connections generation failed.";
}

export async function generateConnectionsCandidatesAction(
  _previousState: ConnectionsAiGeneratorState,
  formData: FormData,
): Promise<ConnectionsAiGeneratorState> {
  await requireAdmin("/admin/connections");

  try {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured on the server.");
    }
    const input = generationInputSchema.parse({
      candidateCount: formData.get("candidateCount"),
      theme: formData.get("theme"),
      season: formData.get("season"),
      episode: formData.get("episode"),
    });
    const generatorModel =
      process.env.CONNECTIONS_GENERATOR_MODEL?.trim() ||
      DEFAULT_CONNECTIONS_GENERATOR_MODEL;
    const criticModel =
      process.env.CONNECTIONS_CRITIC_MODEL?.trim() ||
      DEFAULT_CONNECTIONS_CRITIC_MODEL;
    const result = await generateConnectionsCandidates({
      apiKey,
      candidateCount: input.candidateCount,
      maximumSpoiler: { season: input.season, episode: input.episode },
      theme: input.theme,
      generatorModel,
      criticModel,
    });
    const reviewsByCandidate = new Map(
      result.reviews.map((review) => [review.candidateId, review]),
    );

    return {
      status: "SUCCESS",
      message:
        result.rejected.length > 0
          ? `${result.candidates.length} candidate(s) survived validation; ${result.rejected.length} were rejected.`
          : `${result.candidates.length} candidate(s) generated and reviewed.`,
      candidates: result.candidates.map((candidate) => ({
        id: candidate.source.id,
        theme: candidate.source.theme,
        constructionNotes: candidate.source.constructionNotes,
        categoryIds: candidate.source.categoryIds,
        spoilerLabel: `Season ${candidate.spoilerThrough.season} through episode ${candidate.spoilerThrough.episode}`,
        shuffledTiles: deterministicShuffle(
          candidate.puzzle.groups.flatMap((group) => group.tiles),
          candidate.source.id,
        ),
        groups: candidate.categories.map((category) => ({
          id: category.id,
          label: category.label,
          explanation: category.explanation,
          tiles: category.tiles.map((tile) => tile.text),
        })),
        review: reviewsByCandidate.get(candidate.source.id)!,
      })),
      usage: {
        generatorModel: result.generator.servedModel ?? generatorModel,
        criticModel: result.critic.servedModel ?? criticModel,
        cost:
          result.generator.usage?.cost !== undefined &&
          result.critic.usage?.cost !== undefined
            ? result.generator.usage.cost + result.critic.usage.cost
            : undefined,
      },
    };
  } catch (error) {
    return {
      status: "ERROR",
      message: errorMessage(error),
      candidates: [],
    };
  }
}
