import { upsConfig } from "./config";
import { ShippingError, ErrorCode } from "../errors";

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in ms
}

// Module-level cache — lives for the lifetime of the server process.
let cache: TokenCache | null = null;

// Refresh 60 seconds before actual expiry to avoid races.
const EXPIRY_BUFFER_MS = 60_000;

async function fetchToken(): Promise<TokenCache> {
  const credentials = Buffer.from(
    `${upsConfig.clientId}:${upsConfig.clientSecret}`,
  ).toString("base64");

  const url = `${upsConfig.baseUrl}/security/v1/oauth/token`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "x-merchant-id": upsConfig.clientId,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
  } catch (err) {
    throw new ShippingError(
      ErrorCode.NETWORK_ERROR,
      "Failed to reach UPS authentication endpoint",
      err instanceof Error ? err.message : String(err),
    );
  }

  if (!response.ok) {
    throw new ShippingError(
      ErrorCode.AUTH_ERROR,
      `UPS authentication failed with status ${response.status}`,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ShippingError(
      ErrorCode.INVALID_RESPONSE,
      "UPS returned an unparseable authentication response",
    );
  }

  const payload = data as Record<string, unknown>;
  if (
    typeof payload.access_token !== "string" ||
    typeof payload.expires_in === "undefined"
  ) {
    throw new ShippingError(
      ErrorCode.INVALID_RESPONSE,
      "UPS authentication response is missing required fields",
    );
  }

  const expiresInMs = Number(payload.expires_in) * 1000;
  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + expiresInMs - EXPIRY_BUFFER_MS,
  };
}

/**
 * Returns a valid UPS bearer token.
 *
 * On first call (or after expiry) it fetches a new token via the
 * OAuth2 client-credentials flow and caches the result.
 */
export async function getAccessToken(): Promise<string> {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.accessToken;
  }

  cache = await fetchToken();
  return cache.accessToken;
}

/** Clears the in-memory token cache (useful in tests). */
export function clearTokenCache(): void {
  cache = null;
}
