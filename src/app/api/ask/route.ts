import { NextRequest, NextResponse } from "next/server";
import { askRequestSchema, buildGroundedMessages } from "@/lib/ask-contract";
import { validateGroundedClaims, type GroundedClaim } from "@/lib/citations";
import { consumeWindow, type WindowState } from "@/lib/rate-limit";
import { providerError } from "@/lib/provider-error";
import { buildProviderRequest } from "@/lib/provider-request";

export const runtime = "nodejs";
export const maxDuration = 30;

const answerWindows = new Map<string, WindowState>();
const MAX_BODY_BYTES = 64 * 1024;

function clientKey(request: NextRequest): string {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

class BodyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function readBoundedJson(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new BodyError(415, "Content-Type must be application/json.");
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) throw new BodyError(413, "Request body is too large.");
  if (!request.body) throw new BodyError(400, "JSON body is required.");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new BodyError(413, "Request body is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try { return JSON.parse(text); } catch { throw new BodyError(400, "Invalid JSON body."); }
}

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "This deployment is not configured yet." }, { status: 503 });
  }
  const key = clientKey(request);
  if (!consumeWindow(answerWindows, key, 10)) {
    return NextResponse.json({ error: "Too many questions. Please wait one minute." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof BodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = askRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Question or evidence is invalid." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 24_000);
  try {
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildProviderRequest(
        model,
        buildGroundedMessages(parsed.data.question, parsed.data.evidence)
      )),
      signal: controller.signal
    });

    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after");
      const failure = providerError(response.status);
      if (failure.refused) {
        return NextResponse.json({
          answer: failure.message,
          refused: true,
          citations: [],
          model
        });
      }
      return NextResponse.json(
        { error: failure.message },
        { status: failure.status, headers: retryAfter ? { "Retry-After": retryAfter } : undefined }
      );
    }

    const completion = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) throw new Error("Empty model response");
    const result = JSON.parse(raw) as { claims?: unknown; refused?: unknown; refusalReason?: unknown };
    if (typeof result.refused !== "boolean") throw new Error("Invalid model response");

    if (!result.refused) {
      if (!Array.isArray(result.claims)) throw new Error("Invalid model response");
      const validation = validateGroundedClaims(result.claims as GroundedClaim[], parsed.data.evidence);
      if (!validation.ok) {
        return NextResponse.json({
          answer: "I found related passages, but I could not verify claim-level support with exact source quotes. Try a more specific question.",
          refused: true,
          citations: [],
          model
        });
      }
      return NextResponse.json({ answer: validation.answer, refused: false, citations: validation.cited, model });
    }

    const refusal = typeof result.refusalReason === "string" && result.refusalReason.trim()
      ? result.refusalReason.trim().slice(0, 500)
      : "The supplied passages do not contain enough evidence to answer this question.";
    return NextResponse.json({ answer: refusal, refused: true, citations: [], model });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json({ error: timedOut ? "The model timed out. Please retry." : "The answer could not be verified." }, { status: timedOut ? 504 : 502 });
  } finally {
    clearTimeout(timeout);
  }
}
