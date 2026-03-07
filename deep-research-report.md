# Prompt for Claude: UPS Rating Integration (TypeScript)

You are tasked with building a **shipping integration service in TypeScript** that wraps the UPS APIs. The prompt should instruct the AI to cover the following detailed requirements:

1. **Rate Shopping:** The service must accept a rate request (with origin address, destination address, package dimensions/weight, and an optional UPS service level) and return one or more *normalized* rate quotes. If no service level is specified, use UPS’s **“Shop”** mode (set `RequestOption=Shop` and omit the `<Service>` element) to retrieve rates for *all* available services【19†L164-L169】. The output should be a simple array of quotes (each with service code/name, currency, total charge, etc.), hiding all UPS-specific JSON structure from the caller.

2. **Authentication (OAuth2 Client Credentials):** Implement the UPS OAuth2 client-credentials flow. In practice, this means making a POST to `https://<UPS_BASE_URL>/security/v1/oauth/token` with a Basic Auth header (`Authorization: Basic base64(clientId:clientSecret)`) and the form field `grant_type=client_credentials`【13†L177-L185】. Include the `x-merchant-id` header with the client ID. Cache the returned bearer token and expiration time in memory, and automatically refresh it when expired. (Use `onlinetools.ups.com` for production and `wwwcie.ups.com` for sandbox【13†L194-L202】.) All UPS secrets (client ID, secret, base URL, etc.) must come from environment variables or a config file (e.g. a `.env`). 

3. **Extensible Architecture:** Design the code so that adding new carriers (FedEx, USPS, etc.) or new UPS operations (label purchase, tracking, etc.) does *not* require rewriting existing logic. For example, define a `Carrier` interface with methods like `getRates()`, `track()`, `purchaseLabel()`, etc., and implement a `UpsCarrier` class that implements these methods. Use a factory or registry pattern to select the carrier. Do **not** hardcode UPS; ensure that the UPS-specific logic (endpoints, XML/JSON formats, etc.) is isolated in its adapter class.

4. **Configuration & Secrets:** All configuration (API endpoints, credentials, UPS account number, etc.) must be loaded from environment variables or a configuration module, never hardcoded. Provide a sample `.env.example` with placeholders. For instance:
   ```
   UPS_CLIENT_ID=your_client_id
   UPS_CLIENT_SECRET=your_client_secret
   UPS_BASE_URL=https://onlinetools.ups.com   # or https://wwwcie.ups.com for sandbox
   UPS_SHIPPER_NUMBER=123YOURACCOUNT
   ```
   Use these values in your code to build requests (e.g. include `ShipperNumber` in the UPS JSON).

5. **Strong Types & Validation:** Define TypeScript interfaces for **all** domain models (requests, responses, address objects, package details, etc.) and use a runtime validation schema library (e.g. [Zod](https://zod.dev/)) to enforce them【26†L59-L68】. For example, create a `RateRequest` schema that checks the structure of the input JSON. Validate every incoming request before calling UPS, and validate key parts of the UPS response. If validation fails, throw or return a structured validation error. The point is to catch malformed input early and guarantee type safety.

6. **Error Handling:** Implement comprehensive error handling for realistic failure modes. This includes:
   - **Network/Timeout Errors:** Use timeouts or AbortController on HTTP calls. If a network timeout or DNS error occurs, throw a custom error (e.g. `{code: "NETWORK_ERROR", message: "..."} `).
   - **HTTP Errors:** After each UPS API call, check the HTTP status. For non-2xx codes, throw an error with details. For 401/403 (auth failures), retry obtaining a fresh token or return an `{code: "AUTH_ERROR", message: "Authentication failed"}`. For 429 (rate limiting), optionally implement backoff/retry or return `{code: "RATE_LIMIT", message: "Too many requests"}`.
   - **Malformed Responses:** If JSON parsing fails or required fields are missing, throw `{code: "INVALID_RESPONSE", message: "UPS returned unexpected data"}`. 
   - **Structured Errors:** Always return errors in a consistent format (e.g. `{ code: string, message: string, details?: any }`). Do **not** expose raw stack traces or internal exception messages to the caller【30†L426-L434】. For example, instead of returning a SQL or stack trace error, return a generic message like “An unexpected error occurred”【30†L426-L434】. Use custom error classes or constructors to encapsulate error codes and sanitized messages【30†L461-L469】.

In your prompt to Claude, emphasize **clarity** on these requirements. For example: 

- Describe each requirement in detail as above (rate shopping, OAuth2, etc.).  
- Mention specific UPS conventions (like the token endpoint and Basic auth headers【13†L177-L185】【13†L194-L202】, and using `RequestOption=Shop` for multiple rates【19†L164-L169】).  
- Instruct the AI to use TypeScript best practices, including interfaces and schemas for validation【26†L59-L68】.  
- Highlight error-handling best practices: check `response.ok`, use try/catch, and return structured error objects【30†L426-L434】【30†L461-L469】.  

Make sure the prompt reads like instructions for writing the actual code and does not include the solution code itself. The prompt should be **fully self-contained**, listing all tasks and expectations so that Claude knows exactly what to build.

**Sources:** UPS OAuth and rate API examples【13†L177-L185】【19†L164-L169】, Zod documentation【26†L59-L68】, and error-handling guidelines【30†L426-L434】【30†L461-L469】 provide background for these instructions.