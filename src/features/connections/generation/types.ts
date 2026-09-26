export const CONNECTIONS_GENERATION_PROMPT_VERSION = "connections-generator-v1";

export type ConnectionsCatalogTileKind =
  "CHARACTER" | "CREATURE" | "FOOD" | "MAGIC" | "OBJECT" | "PLACE";

export type ConnectionsSpoilerBoundary = {
  season: number;
  episode: number;
};

export type ConnectionsCatalogTile = {
  id: string;
  text: string;
  kind: ConnectionsCatalogTileKind;
};

export type ConnectionsCatalogCategory = {
  id: string;
  label: string;
  explanation: string;
  spoilerThrough: ConnectionsSpoilerBoundary;
  sourceNote: string;
  tags: string[];
  tiles: ConnectionsCatalogTile[];
};

export type ConnectionsGenerationCatalog = {
  version: number;
  categories: ConnectionsCatalogCategory[];
};

export type GeneratedConnectionsCandidate = {
  id: string;
  theme: string;
  categoryIds: string[];
  constructionNotes: string;
};

export type GeneratedConnectionsBatch = {
  candidates: GeneratedConnectionsCandidate[];
};

export type ConnectionsCriticIssue = {
  severity: "LOW" | "MEDIUM" | "HIGH";
  type:
    | "ALTERNATE_GROUP"
    | "BROAD_LABEL"
    | "OBSCURE_CONNECTION"
    | "RED_HERRING"
    | "SPELLING_OR_LOCALIZATION"
    | "OTHER";
  tileIds: string[];
  explanation: string;
};

export type ConnectionsCandidateReview = {
  candidateId: string;
  fairnessScore: number;
  recommendation: "ACCEPT" | "REVISE" | "REJECT";
  strengths: string[];
  issues: ConnectionsCriticIssue[];
};

export type ConnectionsCriticBatch = {
  reviews: ConnectionsCandidateReview[];
};
