import { upsConfig } from "./config";
import { ShippingError, ErrorCode } from "../errors";

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Makes an authenticated POST request to a UPS API endpoint.
 *
 * @param path   - URL path appended to UPS_BASE_URL (e.g. "/api/rating/v2403/Shop")
 * @param body   - Request payload to serialize as JSON
 * @param token  - Bearer token from {@link getAccessToken}
 * @returns      Parsed JSON response body
 */
export async function upsRequest(
  path: string,
  body: unknown,
  token: string,
): Promise<unknown> {
  const url = `${upsConfig.baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        transId: crypto.randomUUID(),
        transactionSrc: "cybership",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ShippingError(
        ErrorCode.NETWORK_ERROR,
        `UPS request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
      );
    }
    throw new ShippingError(
      ErrorCode.NETWORK_ERROR,
      "Network error while contacting UPS",
      err instanceof Error ? err.message : String(err),
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401 || response.status === 403) {
    throw new ShippingError(
      ErrorCode.AUTH_ERROR,
      "UPS authentication failed — check credentials or token expiry",
    );
  }

  if (response.status === 429) {
    throw new ShippingError(
      ErrorCode.RATE_LIMIT,
      "UPS rate limit exceeded — too many requests",
    );
  }

  if (!response.ok) {
    let errorBody: string;
    try {
      errorBody = await response.text();
    } catch {
      errorBody = "(unreadable)";
    }
    throw new ShippingError(
      ErrorCode.INVALID_RESPONSE,
      `UPS responded with HTTP ${response.status}`,
      errorBody,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ShippingError(
      ErrorCode.INVALID_RESPONSE,
      "UPS returned an unparseable response",
    );
  }

  return data;
}
