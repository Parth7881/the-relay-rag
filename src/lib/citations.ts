import type { EvidenceSource } from "./types";
import { tokenize } from "./retrieval";

export interface GroundedClaim {
  text: string;
  citations: string[];
  quotes: Array<{ sourceId: string; quote: string }>;
}

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function lexicallySupported(claim: string, quotes: string[]): boolean {
  const claimTerms = [...new Set(tokenize(claim))];
  if (claimTerms.length < 2) return false;
  const quoteTerms = new Set(tokenize(quotes.join(" ")));
  const overlap = claimTerms.filter((term) => quoteTerms.has(term)).length;
  return overlap >= 2 && overlap / claimTerms.length >= 0.35;
}

export function validateGroundedClaims(claims: GroundedClaim[], sources: EvidenceSource[]): { ok: boolean; cited: string[]; answer: string } {
  if (!Array.isArray(claims) || claims.length < 1 || claims.length > 8) return { ok: false, cited: [], answer: "" };
  const supplied = new Map(sources.map((source) => [source.id, source]));
  const cited = new Set<string>();
  const answer: string[] = [];

  for (const claim of claims) {
    if (typeof claim.text !== "string" || claim.text.trim().length < 3 || claim.text.length > 600) return { ok: false, cited: [], answer: "" };
    if (!Array.isArray(claim.citations) || !claim.citations.length || !Array.isArray(claim.quotes) || !claim.quotes.length) return { ok: false, cited: [], answer: "" };
    const ids = [...new Set(claim.citations)];
    if (ids.some((id) => !supplied.has(id))) return { ok: false, cited: [], answer: "" };
    const supportingQuotes: string[] = [];
    for (const id of ids) {
      const source = supplied.get(id)!;
      const quote = claim.quotes.find((item) => item.sourceId === id)?.quote;
      if (!quote || quote.length < 10 || !normalized(source.text).includes(normalized(quote))) return { ok: false, cited: [], answer: "" };
      supportingQuotes.push(quote);
      cited.add(id);
    }
    if (!lexicallySupported(claim.text, supportingQuotes)) return { ok: false, cited: [], answer: "" };
    const clean = claim.text.trim().replace(/[.!?]+$/, "");
    answer.push(`${clean} ${ids.map((id) => `[${id}]`).join(" ")}.`);
  }
  return { ok: true, cited: [...cited], answer: answer.join(" ") };
}
