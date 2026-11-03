import type Anthropic from "@anthropic-ai/sdk";

// The ONLY place the app calls Anthropic's Messages API.
//
// Every request is pinned to US-only inference (`inference_geo: "us"`): without it,
// Anthropic's default ("global") may run model inference outside the United States.
// Callers pass exactly what they passed to `client.messages.create` before
// (model, max_tokens, system, messages, …) and cannot override the geo.
// tests/anthropicHelper.test.mjs fails the build if any other file calls the SDK.

export const ANTHROPIC_INFERENCE_GEO = "us";

export type CreateMessageParams = Omit<Anthropic.MessageCreateParamsNonStreaming, "inference_geo" | "stream">;

export async function createMessage(params: CreateMessageParams): Promise<Anthropic.Message> {
  // Lazy import + a client per call, exactly as the routes did before this helper existed.
  const { default: AnthropicSdk } = await import("@anthropic-ai/sdk");
  const client = new AnthropicSdk({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client.messages.create({ ...params, inference_geo: ANTHROPIC_INFERENCE_GEO });
}
