export interface ProviderError {
  status: number;
  message: string;
}

export function providerError(status: number): ProviderError {
  if (status === 401 || status === 403) {
    return { status: 503, message: "The model credential is invalid or has been revoked." };
  }
  if (status === 400 || status === 404 || status === 413 || status === 422) {
    return { status: 422, message: "The model rejected this request. Try a more specific question or select fewer documents." };
  }
  if (status === 429) {
    return { status: 429, message: "The model is rate-limited. Try again shortly." };
  }
  return { status: 503, message: "The model provider is temporarily unavailable. Try again shortly." };
}
