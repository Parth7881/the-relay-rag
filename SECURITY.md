# Security policy

## Supported version

Security updates apply to the current `main` branch.

## Reporting

Please do not open a public issue for a suspected vulnerability. Report it privately to the repository owner through GitHub's private vulnerability reporting feature.

Include the affected route or component, reproduction steps, impact, and a minimal proof of concept. Do not include real API keys or private documents.

## Deployment checklist

- Keep `GROQ_API_KEY` server-only.
- Restrict preview deployments or give them separate low-quota credentials.
- Review Vercel logs for repeated `429` and provider-error responses.
- Add durable rate limiting and authentication before operating a high-traffic public service.
- Run `npm audit --omit=dev`, `npm test`, `npm run lint`, and `npm run build` before release.

## Trust boundaries

PDF content and retrieved passages are untrusted. They may contain prompt-injection text. The model is instructed to treat them only as reference data, requests are bounded with a strict schema, and generated citation identifiers are validated before an answer is displayed.

The current retrieval index is browser-local. Clearing site data removes it. The server does not provide document persistence or account recovery.
