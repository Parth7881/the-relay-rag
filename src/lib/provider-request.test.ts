import { describe, expect, it } from "vitest";
import { buildProviderRequest } from "./provider-request";

describe("buildProviderRequest", () => {
  it("uses Groq strict structured output for deterministic grounded responses", () => {
    const request = buildProviderRequest("openai/gpt-oss-20b", [
      { role: "system", content: "system" },
      { role: "user", content: "question" }
    ]);

    expect(request.response_format.type).toBe("json_schema");
    expect(request.response_format.json_schema.strict).toBe(true);
    expect(request.response_format.json_schema.schema.required).toEqual(["refused", "refusalReason", "claims"]);
    expect(request.response_format.json_schema.schema.additionalProperties).toBe(false);
  });
});
