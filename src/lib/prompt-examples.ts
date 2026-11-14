const SINGLE_SOURCE_PROMPTS = [
  "Summarize this document",
  "What are the main methods in this document?",
  "What limitations does this document report?"
];

const MULTI_SOURCE_PROMPTS = [
  "Summarize the main contributions",
  "Compare the methods across these papers",
  "What limitations do the authors report?"
];

export function promptExamples(selectedSourceCount: number): string[] {
  return selectedSourceCount > 1 ? MULTI_SOURCE_PROMPTS : SINGLE_SOURCE_PROMPTS;
}
