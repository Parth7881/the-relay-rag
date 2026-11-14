export interface ProviderError {
  status: number;
  message: string;
  refused?: boolean;
}

export function providerError(status: number): ProviderError {
  if (status === 401 || status === 403) {
    return { status: 503, message: "The model credential is invalid or has been revoked." };
  }
  if (status === 400 || status === 422) {
    return {
      status: 200,
      message: "The selected passages do not provide enough evidence for a verified answer. Try a more specific question or select different documents.",
      refused: true
    };
  }
  if (status === 404) {
    return { status: 503, message: "The configured model is unavailable." };
  }
  if (status === 413) {
    return { status: 422, message: "The selected evidence is too large. Select fewer documents and try again." };
  }
  if (status === 429) {
    return { status: 429, message: "The model is rate-limited. Try again shortly." };
  }
  return { status: 503, message: "The model provider is temporarily unavailable. Try again shortly." };
}
