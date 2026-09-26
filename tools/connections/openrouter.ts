import { z } from "zod";

type OpenRouterMessage = {
  role: "system" | "user";
  content: string;
};

type StructuredRequest<T> = {
  apiKey: string;
  model: string;
  schemaName: string;
  jsonSchema: object;
  outputSchema: z.ZodType<T>;
  messages: OpenRouterMessage[];
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
  maxCompletionTokens: number;
  fetchImplementation?: typeof fetch;
};

const openRouterResponseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.string().nullable(),
          refusal: z.string().nullable().optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().nonnegative().optional(),
      completion_tokens: z.number().int().nonnegative().optional(),
      total_tokens: z.number().int().nonnegative().optional(),
      cost: z.number().nonnegative().optional(),
    })
    .optional(),
});

export type OpenRouterStructuredResult<T> = {
  data: T;
  servedModel?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number;
  };
};

export async function requestOpenRouterStructuredOutput<T>(
  request: StructuredRequest<T>,
): Promise<OpenRouterStructuredResult<T>> {
  const fetchImplementation = request.fetchImplementation ?? fetch;
  const response = await fetchImplementation(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://frieren.oreotm.xyz",
        "X-Title": "Magic in Passing Connections Authoring",
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        ...(request.temperature === undefined
          ? {}
          : { temperature: request.temperature }),
        ...(request.reasoningEffort === undefined
          ? {}
          : { reasoning: { effort: request.reasoningEffort } }),
        max_completion_tokens: request.maxCompletionTokens,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: request.schemaName,
            strict: true,
            schema: request.jsonSchema,
          },
        },
        provider: {
          require_parameters: true,
          data_collection: "deny",
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    const responseBody = (await response.text()).slice(0, 2_000);
    throw new Error(
      `OpenRouter request failed (${response.status}): ${responseBody || response.statusText}`,
    );
  }

  const envelope = openRouterResponseSchema.parse(await response.json());
  const choice = envelope.choices[0];
  const content = choice.message.content;
  if (!content) {
    const reason = choice.message.refusal
      ? `refusal: ${choice.message.refusal}`
      : `finish reason: ${choice.finish_reason ?? "unknown"}`;
    throw new Error(`OpenRouter returned no structured output (${reason}).`);
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(content);
  } catch {
    throw new Error(
      `OpenRouter returned invalid structured JSON (finish reason: ${choice.finish_reason ?? "unknown"}).`,
    );
  }

  return {
    data: request.outputSchema.parse(decoded),
    servedModel: envelope.model,
    usage: envelope.usage,
  };
}
