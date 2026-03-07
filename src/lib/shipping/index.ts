/**
 * Public API surface for the shipping integration library.
 *
 * All downstream code (API routes, services, tests) should import from
 * this barrel rather than reaching into internal paths.  Internal
 * implementation details (UPS-specific schemas, auth helpers, etc.) are
 * intentionally not re-exported here.
 *
 * Usage:
 *   import { getCarrier, registerCarrierFactory, type RateRequest } from "@/lib/shipping";
 */

// ─── Carrier registry ─────────────────────────────────────────────────────────
export { getCarrier, registerCarrier, registerCarrierFactory } from "./factory";

// ─── Domain types ─────────────────────────────────────────────────────────────
export type {
  Address,
  Package,
  RateRequest,
  RateQuote,
  LabelRequest,
  Label,
  TrackingResult,
  TrackingEvent,
  AddressValidationResult,
  ShippingErrorPayload,
} from "./types";

// ─── Carrier interface ────────────────────────────────────────────────────────
export type { Carrier } from "./carrier";

// ─── Errors ───────────────────────────────────────────────────────────────────
export { ShippingError, ErrorCode } from "./errors";

// ─── Input validation schema ──────────────────────────────────────────────────
export { RateRequestSchema } from "./schemas";
export type { RateRequestInput } from "./schemas";
