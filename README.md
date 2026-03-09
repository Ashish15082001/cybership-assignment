# Cybership — Shipping Carrier Integration Service

A Next.js API service that wraps real-time shipping carrier APIs (UPS today; architected for FedEx, USPS, DHL, etc.) to return normalized rate quotes via a single REST endpoint.

> **A note on AI assistance:** I deliberately avoided using AI to generate code I couldn't explain myself. Everything in this codebase reflects decisions I understand and can reason through — the architecture, the error handling, the Zod validation boundaries, the token caching strategy. If I couldn't explain why something works, I didn't ship it.

---

## How to Run

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your UPS credentials:

```bash
cp .env.example .env.local
```

| Variable             | Description                                               |
| -------------------- | --------------------------------------------------------- |
| `UPS_CLIENT_ID`      | OAuth2 client ID from the UPS Developer Portal            |
| `UPS_CLIENT_SECRET`  | OAuth2 client secret                                      |
| `UPS_SHIPPER_NUMBER` | 6-character UPS account/shipper number                    |
| `UPS_BASE_URL`       | Base URL — defaults to `https://wwwcie.ups.com` (sandbox) |

> **No live credentials?** The service is structurally complete and all logic can be exercised with mocked HTTP responses — none of the UPS-specific code runs until a request actually arrives.

### 3. Start the development server

```bash
npm run dev
```

The API is now available at `http://localhost:3000`.

### 4. Request a rate quote

```bash
curl -X POST http://localhost:3000/api/rates \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {
      "addressLines": ["123 Main St"],
      "city": "New York",
      "stateCode": "NY",
      "postalCode": "10001",
      "countryCode": "US"
    },
    "destination": {
      "addressLines": ["456 Oak Ave"],
      "city": "Los Angeles",
      "stateCode": "CA",
      "postalCode": "90001",
      "countryCode": "US"
    },
    "packages": [{ "weightLbs": 5, "lengthIn": 10, "widthIn": 8, "heightIn": 6 }],
    "carriers": ["ups"]
  }'
```

**Success response (200):**

```json
[
  {
    "carrier": "ups",
    "serviceCode": "03",
    "serviceName": "UPS Ground",
    "currency": "USD",
    "totalCharge": "18.45"
  }
]
```

### 5. Run tests

```bash
npx vitest run
```

### 6. Lint

```bash
npm run lint
```

### 7. Production build

```bash
npm run build
npm start
```

---

## Design Decisions

### Carrier interface + registry (open/closed principle)

Every carrier implements a four-method `Carrier` interface (`getRates`, `purchaseLabel`, `track`, `validateAddress`). The carrier registry (`factory.ts`) maps lowercase string names to lazy factory thunks — `getCarrier("ups")` returns the right implementation without any `if/switch` on carrier names in `route.ts`. Adding FedEx means creating a module and calling `registerCarrierFactory("fedex", ...)` once; nothing else changes.

### Lazy instantiation via factory thunks

Carriers are registered as factory functions, not instances. The factory is invoked on first use and the result is cached. This means missing `FEDEX_*` env vars will not crash a process that only handles UPS requests — the error surfaces precisely when the misconfigured carrier is actually called.

### Zod for all boundaries

Zod schemas guard two boundaries:

1. **Incoming requests** — `RateRequestSchema` in `schemas.ts` validates and normalises caller input (uppercasing country codes, enforcing positive dimensions, etc.) before any carrier code runs.
2. **Outgoing carrier responses** — `UpsRateResponseSchema` validates the UPS API payload before fields are accessed. An unexpected shape throws `INVALID_RESPONSE` rather than a silent `undefined` property access.

### `ShippingError` + `ErrorCode` enum

All domain failures are `ShippingError` instances with a typed `ErrorCode`. `route.ts` maps those codes to appropriate HTTP statuses (e.g. `AUTH_ERROR → 502`, `RATE_LIMIT → 503`). Callers never see raw carrier errors or Node.js stack traces.

### `totalCharge` as a string

Monetary values from the UPS API arrive as strings (`"18.45"`). They are forwarded as strings rather than being parsed to `number`, avoiding IEEE 754 floating-point precision loss on values like `"18.10"`.

### Parallel fan-out with `Promise.allSettled`

When multiple carriers are requested, all `getRates` calls are fired in parallel. `allSettled` guarantees that one carrier timing out or throwing does not suppress results from others — partial success returns whatever quotes were obtained alongside a structured `errors` array.

### OAuth2 token caching with pre-emptive refresh

The UPS bearer token is cached in module-level state and refreshed 60 seconds before it expires. This avoids a round-trip to the auth endpoint on every request while guarding against using a token that expires mid-flight.

### Barrel export

All public symbols are re-exported from `src/lib/shipping/index.ts`. Application code imports only from `@/lib/shipping`, so internal module boundaries can be refactored freely without touching callers.

---

## What I Would Improve Given More Time

### Testing

- Add unit tests for every module (`auth.ts`, `client.ts`, `adapter.ts`, `factory.ts`, `route.ts`) using `vitest` + `msw` to intercept and mock UPS HTTP calls — the `__tests__/` directory is already scaffolded.
- Add integration tests that spin up the Next.js server and fire real HTTP requests against `POST /api/rates`.

### Additional carriers

- Implement FedEx, USPS, and DHL adapters following the same `config → auth → client → schemas → adapter` pattern already established for UPS. Each carrier only needs its own subdirectory; the registry and route handler need no changes.

### Remaining UPS operations

- Implement `purchaseLabel`, `track`, and `validateAddress` in `ups/adapter.ts` — all three currently throw `NOT_IMPLEMENTED`. The `Carrier` interface, error types, and domain types for all three are already defined.

### Observability

- Add structured logging (e.g. `pino`) with a `transId` correlation ID threaded through auth, HTTP client, and adapter calls so individual requests are traceable end-to-end.
- Expose a `/api/health` endpoint that checks carrier reachability and token validity.

### Caching

- Cache rate quotes by a hash of the request (origin + destination + packages + serviceCode) with a short TTL (e.g. 60 s) to avoid redundant carrier API calls for identical inputs.

### Rate limiting and auth

- Add an API key or JWT middleware in front of `POST /api/rates` so the service is not open to arbitrary callers once deployed.
- Apply per-client rate limiting to stay within carrier API quotas and protect against abuse.

### Configuration hardening

- Move `UPS_BASE_URL` selection (sandbox vs. production) to a `NODE_ENV`-aware helper so it cannot be accidentally left on the sandbox URL in production.

### Multi-package optimisation

- The current adapter sends one UPS `Rate` / `Shop` call per request. For multi-package shipments the payload already groups packages correctly, but the response normalisation could be extended to surface per-package charges where the carrier provides them.
