import { NextRequest, NextResponse } from "next/server";
import {
  RateRequestSchema,
  getCarrier,
  ShippingError,
  ErrorCode,
} from "@/lib/shipping";

/** Maps ShippingError codes to appropriate HTTP status codes. */
function statusForCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.VALIDATION_ERROR:
      return 400;
    case ErrorCode.AUTH_ERROR:
      return 502; // upstream auth failure — don't expose 401 to caller
    case ErrorCode.RATE_LIMIT:
      return 503;
    case ErrorCode.NETWORK_ERROR:
      return 504;
    case ErrorCode.NOT_IMPLEMENTED:
      return 501;
    default:
      return 502;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse request body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  // 2. Validate input schema
  const parsed = RateRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  // 3. Fan out to each requested carrier in parallel
  const { carriers, ...rateRequest } = parsed.data;

  const results = await Promise.allSettled(
    carriers.map((name) => getCarrier(name).getRates(rateRequest)),
  );

  const quotes = [];
  const errors = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      quotes.push(...result.value);
    } else {
      const err = result.reason;
      const carrier = carriers[i];
      if (err instanceof ShippingError) {
        errors.push({ carrier, code: err.code, message: err.message });
      } else {
        console.error(
          `[POST /api/rates] Unexpected error from carrier "${carrier}":`,
          err,
        );
        errors.push({
          carrier,
          code: "UNKNOWN",
          message: "An unexpected error occurred",
        });
      }
    }
  }

  // If every carrier failed, return an error response.
  if (quotes.length === 0 && errors.length > 0) {
    const first = errors[0];
    const status =
      first.code in ErrorCode ? statusForCode(first.code as ErrorCode) : 502;
    return NextResponse.json(
      { code: first.code, message: first.message, errors },
      { status },
    );
  }

  // Partial success is fine — return whatever quotes we got, plus any carrier errors.
  return NextResponse.json(errors.length > 0 ? { quotes, errors } : quotes, {
    status: 200,
  });
}
