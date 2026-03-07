import type {
  RateRequest,
  RateQuote,
  LabelRequest,
  Label,
  TrackingResult,
  AddressValidationResult,
  Address,
} from "./types";

/**
 * Common interface every carrier adapter must implement.
 *
 * Carriers that do not yet support an operation should throw a
 * ShippingError with code NOT_IMPLEMENTED rather than leaving the
 * method absent, so callers can always rely on the same interface shape.
 */
export interface Carrier {
  /** Return rate quotes for the given request. */
  getRates(request: RateRequest): Promise<RateQuote[]>;

  /**
   * Purchase a shipping label for a shipment.
   * Unlike getRates, a serviceCode is required — the caller must have
   * already selected a service before purchasing.
   */
  purchaseLabel(request: LabelRequest): Promise<Label>;

  /**
   * Track a shipment by its carrier-issued tracking number.
   */
  track(trackingNumber: string): Promise<TrackingResult>;

  /**
   * Validate and optionally correct/standardize a postal address.
   */
  validateAddress(address: Address): Promise<AddressValidationResult>;
}
