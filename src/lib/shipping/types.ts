// ─── Domain Types ────────────────────────────────────────────────────────────

export interface Address {
  name?: string;
  /** Street lines (max 2) */
  addressLines: string[];
  city: string;
  /** State / province / region code */
  stateCode: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "US" */
  countryCode: string;
}

export interface Package {
  /** Weight in pounds */
  weightLbs: number;
  /** Length in inches */
  lengthIn: number;
  /** Width in inches */
  widthIn: number;
  /** Height in inches */
  heightIn: number;
}

// ─── Rate Shopping ────────────────────────────────────────────────────────────

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
 * Input for purchasing a shipping label.
 * Unlike RateRequest, a service code is required — you must have
 * already selected a service before buying a label.
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

export interface TrackingEvent {
  /** ISO 8601 timestamp */
  timestamp: string;
  location?: string;
  description: string;
  statusCode?: string;
}

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

export interface ShippingErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}
