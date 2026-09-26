import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { requestOpenRouterStructuredOutput } from "./openrouter";

describe("OpenRouter structured output client", () => {
  it("requests strict JSON and validates the decoded response", async () => {
    const fetchImplementation = vi.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body.provider).toEqual({
        require_parameters: true,
        data_collection: "deny",
      });
      expect(body.response_format.json_schema.strict).toBe(true);
      expect(body.temperature).toBe(0);

      return new Response(
        JSON.stringify({
          model: "example/model",
          choices: [{ message: { content: JSON.stringify({ answer: 42 }) } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await requestOpenRouterStructuredOutput({
      apiKey: "test-key",
      model: "example/model",
      schemaName: "answer",
      jsonSchema: {
        type: "object",
        properties: { answer: { type: "number" } },
        required: ["answer"],
        additionalProperties: false,
      },
      outputSchema: z.object({ answer: z.number() }).strict(),
      messages: [{ role: "user", content: "Question" }],
      temperature: 0,
      maxCompletionTokens: 100,
      fetchImplementation,
    });

    expect(result).toEqual({
      data: { answer: 42 },
      servedModel: "example/model",
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
  });

  it("omits temperature for models that do not support it", async () => {
    const fetchImplementation = vi.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body).not.toHaveProperty("temperature");

      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ answer: 42 }) } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    await requestOpenRouterStructuredOutput({
      apiKey: "test-key",
      model: "example/reasoning-model",
      schemaName: "answer",
      jsonSchema: {},
      outputSchema: z.object({ answer: z.number() }),
      messages: [{ role: "user", content: "Question" }],
      maxCompletionTokens: 100,
      fetchImplementation,
    });
  });

  it("does not expose the API key when OpenRouter rejects a request", async () => {
    const fetchImplementation = vi.fn(async () =>
      Promise.resolve(new Response("bad request", { status: 400 })),
    ) as typeof fetch;

    await expect(
      requestOpenRouterStructuredOutput({
        apiKey: "secret-key",
        model: "example/model",
        schemaName: "answer",
        jsonSchema: {},
        outputSchema: z.object({}),
        messages: [{ role: "user", content: "Question" }],
        temperature: 0,
        maxCompletionTokens: 100,
        fetchImplementation,
      }),
    ).rejects.toThrow("OpenRouter request failed (400): bad request");
  });
});
