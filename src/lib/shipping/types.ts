// ─── Domain Types ────────────────────────────────────────────────────────────

/**
 * Represents a physical mailing address.
 * Used as the origin or destination in rate requests, label purchases,
 * and address validation calls. Also returned by carriers as a normalized
 * or suggested address in `AddressValidationResult`.
 */
export interface Address {
  name?: string;
  /** Street lines (max 2) */
  addressLines: string[];
  city: string;
  stateCode: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US" */
  countryCode: string;
}

/**
 * Describes the physical dimensions and weight of a single parcel.
 * Used inside `RateRequest` and `LabelRequest` to let carriers calculate
 * applicable service options and pricing. All units are imperial:
 * weight in pounds, dimensions in inches.
 */
export interface Package {
  weightLbs: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

// ─── Rate Shopping ────────────────────────────────────────────────────────────

/**
 * Input payload sent to `POST /api/rates` to retrieve shipping rate quotes.
 * Passed to each carrier's `getRates()` method. When `serviceCode` is omitted
 * the carrier runs in "shop" mode and returns rates for all available services.
 * When `carriers` is omitted it defaults to `["ups"]`.
 */
export interface RateRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  /**
   * Carrier-specific service code (e.g. "03" for UPS Ground).
   * When omitted the carrier returns rates for *all* available services
   * (Shop mode).
   */
  serviceCode?: string;
  /**
   * One or more registered carrier names to shop (e.g. ["ups", "fedex"]).
   * Defaults to ["ups"] when omitted.
   */
  carriers?: string[];
}

/**
 * A single carrier rate quote returned by `getRates()`.
 * Normalized to a carrier-agnostic shape so consumers never deal with
 * raw carrier JSON. `totalCharge` is kept as a string to avoid IEEE 754
 * floating-point precision issues when handling monetary values.
 */
export interface RateQuote {
  /** Carrier-specific service code */
  serviceCode: string;
  /** Human-readable service name */
  serviceName: string;
  /** ISO 4217 currency code, e.g. "USD" */
  currency: string;
  /** Total charge as a numeric string to avoid floating-point issues */
  totalCharge: string;
  /** Carrier name, useful when results from multiple carriers are combined */
  carrier: string;
}

// ─── Label Purchase ───────────────────────────────────────────────────────────

/**
 * Input payload for purchasing a shipping label via `purchaseLabel()`.
 * Similar to `RateRequest` but `serviceCode` is required because a specific
 * service must have been selected (e.g. from a prior rate-shop result)
 * before a label can be generated.
 */
export interface LabelRequest {
  origin: Address;
  destination: Address;
  packages: Package[];
  /** The specific carrier service code to use (e.g. "03" for UPS Ground) */
  serviceCode: string;
  /** Optional shipper reference number printed on the label */
  referenceNumber?: string;
}

/**
 * The shipping label returned by `purchaseLabel()` after a successful
 * label purchase. Contains the carrier-assigned tracking number and the
 * raw label document encoded as a base64 string in the specified format
 * (ZPL for thermal printers, PDF or PNG for desktop printing).
 */
export interface Label {
  carrier: string;
  trackingNumber: string;
  serviceCode: string;
  /** Format of the encoded label data */
  labelFormat: "ZPL" | "PDF" | "PNG";
  /** Base64-encoded label document */
  labelData: string;
}

// ─── Tracking ─────────────────────────────────────────────────────────────────

/**
 * A single checkpoint in a shipment's journey, returned as part of
 * `TrackingResult.events`. Each event captures when and where a scan
 * occurred and a human-readable description of the scan activity.
 */
export interface TrackingEvent {
  /** ISO 8601 timestamp */
  timestamp: string;
  location?: string;
  description: string;
  statusCode?: string;
}

/**
 * The full tracking response returned by a carrier's `track()` method.
 * Contains the current shipment status, an optional estimated delivery date,
 * and the chronological list of scan events. Normalized to a carrier-agnostic
 * shape so callers never parse raw carrier tracking JSON.
 */
export interface TrackingResult {
  carrier: string;
  trackingNumber: string;
  /** Human-readable shipment status (e.g. "In Transit", "Delivered") */
  status: string;
  /** ISO 8601 date, if provided by the carrier */
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

// ─── Address Validation ───────────────────────────────────────────────────────

/**
 * The response returned by a carrier's `validateAddress()` method.
 * Indicates whether the supplied address is deliverable (`valid`), and
 * optionally provides a carrier-corrected `normalized` address or a list
 * of `suggestions` when the input was ambiguous or partially incorrect.
 */
export interface AddressValidationResult {
  valid: boolean;
  /** Carrier-corrected/standardized address, when available */
  normalized?: Address;
  /** Alternative addresses suggested by the carrier */
  suggestions?: Address[];
  /** Informational messages returned by the carrier */
  messages?: string[];
}

// ─── Errors ───────────────────────────────────────────────────────────────────

/**
 * The JSON body shape used in HTTP error responses from `POST /api/rates`
 * (and any future endpoints). Serialized from a caught `ShippingError` so
 * callers receive a consistent, structured error object instead of raw
 * exception messages.
 */
export interface ShippingErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}
