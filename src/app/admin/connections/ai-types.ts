import type { ConnectionsCandidateReview } from "@/features/connections/generation/types";

export type AdminGeneratedConnectionsCandidate = {
  id: string;
  theme: string;
  constructionNotes: string;
  categoryIds: string[];
  spoilerLabel: string;
  shuffledTiles: Array<{ id: string; text: string }>;
  groups: Array<{
    id: string;
    label: string;
    explanation: string;
    tiles: string[];
  }>;
  review: ConnectionsCandidateReview;
};

export type ConnectionsAiGeneratorState = {
  status: "IDLE" | "ERROR" | "SUCCESS";
  message: string;
  candidates: AdminGeneratedConnectionsCandidate[];
  usage?: {
    generatorModel: string;
    criticModel: string;
    cost?: number;
  };
};

export const initialConnectionsAiGeneratorState: ConnectionsAiGeneratorState = {
  status: "IDLE",
  message: "",
  candidates: [],
};
