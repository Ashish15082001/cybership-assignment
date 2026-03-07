import type { Carrier } from "./carrier";
import { ShippingError, ErrorCode } from "./errors";

type CarrierName = string;

// Stores factories (thunks) rather than instances.
// This defers construction — and therefore config validation — until the
// first time a carrier is actually used. A missing FEDEX_* env var will
// not crash a request that only needs UPS.
const registry = new Map<CarrierName, () => Carrier>();

/**
 * Register a carrier instance under a given name.
 * The instance is wrapped in a thunk so the registry stays uniform.
 * Overwrites any previously registered carrier with the same name.
 */
export function registerCarrier(name: CarrierName, carrier: Carrier): void {
  registry.set(name.toLowerCase(), () => carrier);
}

/**
 * Register a factory function for lazy carrier instantiation.
 * The factory is called once on first use and the result is cached.
 */
export function registerCarrierFactory(
  name: CarrierName,
  factory: () => Carrier,
): void {
  let instance: Carrier | null = null;
  registry.set(name.toLowerCase(), () => {
    if (!instance) instance = factory();
    return instance;
  });
}

/**
 * Retrieve a registered carrier by name.
 *
 * @throws {ShippingError} when no carrier is registered under the given name.
 */
export function getCarrier(name: CarrierName): Carrier {
  const factory = registry.get(name.toLowerCase());
  if (!factory) {
    throw new ShippingError(
      ErrorCode.VALIDATION_ERROR,
      `No carrier registered under "${name}". ` +
        `Available: ${[...registry.keys()].join(", ") || "(none)"}`,
    );
  }
  return factory();
}

// ─── Default registrations ────────────────────────────────────────────────────
// Using lazy factories so that a missing carrier config does not crash the
// process at import time — the error surfaces only when that carrier is called.

registerCarrierFactory("ups", () => {
  // Dynamic import keeps the UPS config from being evaluated until needed.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { UpsCarrier } = require("./ups/adapter") as {
    UpsCarrier: new () => Carrier;
  };
  return new UpsCarrier();
});
