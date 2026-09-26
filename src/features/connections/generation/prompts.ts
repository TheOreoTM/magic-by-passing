import type { MaterializedConnectionsCandidate } from "./validation";
import {
  CONNECTIONS_GENERATION_PROMPT_VERSION,
  type ConnectionsCatalogCategory,
  type ConnectionsSpoilerBoundary,
} from "./types";

type PromptMessage = {
  role: "system" | "user";
  content: string;
};

export function buildConnectionsGeneratorMessages(input: {
  categories: ConnectionsCatalogCategory[];
  candidateCount: number;
  maximumSpoiler: ConnectionsSpoilerBoundary;
  theme: string;
}): PromptMessage[] {
  return [
    {
      role: "system",
      content: [
        `Prompt version: ${CONNECTIONS_GENERATION_PROMPT_VERSION}.`,
        "You construct fair four-by-four Connections puzzle drafts for a Frieren anime game.",
        "Choose only category IDs from the supplied curated catalogue.",
        "Each candidate must choose exactly four categories whose sixteen tile IDs are all distinct.",
        "Prefer combinations with interesting three-tile overlaps or semantic red herrings, but avoid any unintended complete four-tile category.",
        "Use the supplied labels and explanations unchanged; do not invent lore, tiles, categories, or dialogue.",
        "Vary the candidates. Construction notes should briefly explain the intended difficulty and red herrings.",
        "Return only data matching the response schema.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          request: {
            candidateCount: input.candidateCount,
            theme: input.theme,
            maximumSpoiler: input.maximumSpoiler,
          },
          categories: input.categories.map((category) => ({
            id: category.id,
            label: category.label,
            explanation: category.explanation,
            tags: category.tags,
            spoilerThrough: category.spoilerThrough,
            tiles: category.tiles.map((tile) => ({
              id: tile.id,
              text: tile.text,
              kind: tile.kind,
            })),
          })),
        },
        null,
        2,
      ),
    },
  ];
}

export function buildConnectionsCriticMessages(
  candidates: MaterializedConnectionsCandidate[],
): PromptMessage[] {
  return [
    {
      role: "system",
      content: [
        `Prompt version: ${CONNECTIONS_GENERATION_PROMPT_VERSION}.`,
        "You are an adversarial editor reviewing Frieren Connections puzzle drafts.",
        "Try to defeat each board. Flag broad or misleading labels, obscure leaps, overly convincing red herrings, spelling/localization concerns, and any plausible alternate group.",
        "Review each candidate as an independent board. Never use tiles or categories from one candidate to criticize another candidate.",
        "Tile and category IDs are normalized internal identifiers, not player-facing text. Do not flag missing accents, capitalization, or punctuation in an ID when the corresponding text is correct.",
        "When reporting an issue, tileIds must contain only tile IDs from that same candidate. Never put category IDs or display text in tileIds.",
        "The deterministic validator has already checked exact catalogue groups. Near matches are supplied because three tiles from another category may create a useful or unfair distraction.",
        "Do not add outside lore as fact. Base the review only on the supplied curated categories and source notes.",
        "A score of 8–10 should be reserved for boards that appear fair enough for human playtesting. Never claim a board is ready to publish without human review.",
        "Return exactly one review for every candidate and only data matching the response schema.",
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify(
        candidates.map((candidate) => ({
          candidateId: candidate.source.id,
          theme: candidate.source.theme,
          constructionNotes: candidate.source.constructionNotes,
          spoilerThrough: candidate.spoilerThrough,
          groups: candidate.categories.map((category) => ({
            id: category.id,
            label: category.label,
            explanation: category.explanation,
            sourceNote: category.sourceNote,
            tiles: category.tiles.map((tile) => ({
              id: tile.id,
              text: tile.text,
            })),
          })),
          deterministicNearMatches: candidate.nearMatches,
        })),
        null,
        2,
      ),
    },
  ];
}
