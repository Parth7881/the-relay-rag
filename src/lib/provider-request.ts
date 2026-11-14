import type { ChatMessage } from "./ask-contract";

const groundedResponseSchema = {
  type: "object",
  properties: {
    refused: { type: "boolean" },
    refusalReason: { type: ["string", "null"] },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          citations: { type: "array", items: { type: "string" } },
          quotes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sourceId: { type: "string" },
                quote: { type: "string" }
              },
              required: ["sourceId", "quote"],
              additionalProperties: false
            }
          }
        },
        required: ["text", "citations", "quotes"],
        additionalProperties: false
      }
    }
  },
  required: ["refused", "refusalReason", "claims"],
  additionalProperties: false
} as const;

export function buildProviderRequest(model: string, messages: ChatMessage[]) {
  return {
    model,
    messages,
    temperature: 0.1,
    max_completion_tokens: 700,
    response_format: {
      type: "json_schema" as const,
      json_schema: {
        name: "grounded_document_answer",
        strict: true,
        schema: groundedResponseSchema
      }
    }
  };
}
