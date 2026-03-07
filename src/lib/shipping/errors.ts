export enum ErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  RATE_LIMIT = "RATE_LIMIT",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
  UNKNOWN = "UNKNOWN",
}

export class ShippingError extends Error {
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ShippingError";
    this.code = code;
    this.details = details;

    // Restore prototype chain when transpiling to ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }
}
