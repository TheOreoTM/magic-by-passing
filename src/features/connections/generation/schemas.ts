import { z } from "zod";

const candidateIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);

export const generatedConnectionsCandidateSchema = z
  .object({
    id: candidateIdSchema,
    theme: z.string().trim().min(1).max(120),
    categoryIds: z.array(z.string().trim().min(1).max(80)).length(4),
    constructionNotes: z.string().trim().min(1).max(800),
  })
  .strict();

export const generatedConnectionsBatchSchema = z
  .object({
    candidates: z.array(generatedConnectionsCandidateSchema).min(1).max(5),
  })
  .strict();

export const connectionsCriticIssueSchema = z
  .object({
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    type: z.enum([
      "ALTERNATE_GROUP",
      "BROAD_LABEL",
      "OBSCURE_CONNECTION",
      "RED_HERRING",
      "SPELLING_OR_LOCALIZATION",
      "OTHER",
    ]),
    tileIds: z.array(z.string().trim().min(1).max(80)).max(4),
    explanation: z.string().trim().min(1).max(800),
  })
  .strict();

export const connectionsCandidateReviewSchema = z
  .object({
    candidateId: candidateIdSchema,
    fairnessScore: z.number().int().min(1).max(10),
    recommendation: z.enum(["ACCEPT", "REVISE", "REJECT"]),
    strengths: z.array(z.string().trim().min(1).max(400)).max(5),
    issues: z.array(connectionsCriticIssueSchema).max(12),
  })
  .strict();

export const connectionsCriticBatchSchema = z
  .object({
    reviews: z.array(connectionsCandidateReviewSchema).min(1).max(5),
  })
  .strict();

export function generatedConnectionsBatchJsonSchema(input: {
  candidateCount: number;
  categoryIds: string[];
}) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      candidates: {
        type: "array",
        minItems: input.candidateCount,
        maxItems: input.candidateCount,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: {
              type: "string",
              pattern: "^[a-z0-9-]+$",
              minLength: 1,
              maxLength: 64,
            },
            theme: { type: "string", minLength: 1, maxLength: 120 },
            categoryIds: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "string",
                enum: input.categoryIds,
              },
            },
            constructionNotes: {
              type: "string",
              minLength: 1,
              maxLength: 800,
            },
          },
          required: ["id", "theme", "categoryIds", "constructionNotes"],
        },
      },
    },
    required: ["candidates"],
  } as const;
}

export function connectionsCriticBatchJsonSchema(input: {
  candidateIds: string[];
}) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      reviews: {
        type: "array",
        minItems: input.candidateIds.length,
        maxItems: input.candidateIds.length,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            candidateId: {
              type: "string",
              enum: input.candidateIds,
            },
            fairnessScore: { type: "integer", minimum: 1, maximum: 10 },
            recommendation: {
              type: "string",
              enum: ["ACCEPT", "REVISE", "REJECT"],
            },
            strengths: {
              type: "array",
              maxItems: 5,
              items: { type: "string", minLength: 1, maxLength: 400 },
            },
            issues: {
              type: "array",
              maxItems: 12,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  severity: {
                    type: "string",
                    enum: ["LOW", "MEDIUM", "HIGH"],
                  },
                  type: {
                    type: "string",
                    enum: [
                      "ALTERNATE_GROUP",
                      "BROAD_LABEL",
                      "OBSCURE_CONNECTION",
                      "RED_HERRING",
                      "SPELLING_OR_LOCALIZATION",
                      "OTHER",
                    ],
                  },
                  tileIds: {
                    type: "array",
                    maxItems: 4,
                    items: { type: "string", minLength: 1, maxLength: 80 },
                  },
                  explanation: {
                    type: "string",
                    minLength: 1,
                    maxLength: 800,
                  },
                },
                required: ["severity", "type", "tileIds", "explanation"],
              },
            },
          },
          required: [
            "candidateId",
            "fairnessScore",
            "recommendation",
            "strengths",
            "issues",
          ],
        },
      },
    },
    required: ["reviews"],
  } as const;
}
