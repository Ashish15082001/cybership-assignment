import type { Carrier } from "../carrier";
import type {
  RateRequest,
  RateQuote,
  LabelRequest,
  Label,
  TrackingResult,
  AddressValidationResult,
  Address,
} from "../types";
import { ShippingError, ErrorCode } from "../errors";
import { upsConfig } from "./config";
import { getAccessToken } from "./auth";
import { upsRequest } from "./client";
import { UpsRateResponseSchema } from "./schemas";

// UPS service code → friendly name fallback table.
// The API usually returns a Description; this is a safety net.
const UPS_SERVICE_NAMES: Record<string, string> = {
  "01": "UPS Next Day Air",
  "02": "UPS 2nd Day Air",
  "03": "UPS Ground",
  "07": "UPS Worldwide Express",
  "08": "UPS Worldwide Expedited",
  "11": "UPS Standard",
  "12": "UPS 3-Day Select",
  "13": "UPS Next Day Air Saver",
  "14": "UPS Next Day Air Early",
  "54": "UPS Worldwide Express Plus",
  "59": "UPS 2nd Day Air AM",
  "65": "UPS Saver",
};

function buildRatePayload(request: RateRequest): unknown {
  const { origin, destination, packages, serviceCode } = request;

  // When serviceCode is provided use "Rate" (single service);
  // when omitted use "Shop" to retrieve all available services.
  const requestOption = serviceCode ? "Rate" : "Shop";

  return {
    RateRequest: {
      Request: {
        RequestOption: requestOption,
        TransactionReference: {
          CustomerContext: "cybership-rate-request",
        },
      },
      Shipment: {
        Shipper: {
          Name: origin.name ?? "Shipper",
          ShipperNumber: upsConfig.shipperNumber,
          Address: {
            AddressLine: origin.addressLines,
            City: origin.city,
            StateProvinceCode: origin.stateCode,
            PostalCode: origin.postalCode,
            CountryCode: origin.countryCode,
          },
        },
        ShipTo: {
          Name: destination.name ?? "Recipient",
          Address: {
            AddressLine: destination.addressLines,
            City: destination.city,
            StateProvinceCode: destination.stateCode,
            PostalCode: destination.postalCode,
            CountryCode: destination.countryCode,
          },
        },
        ShipFrom: {
          Name: origin.name ?? "Shipper",
          Address: {
            AddressLine: origin.addressLines,
            City: origin.city,
            StateProvinceCode: origin.stateCode,
            PostalCode: origin.postalCode,
            CountryCode: origin.countryCode,
          },
        },
        // Include Service element only when a specific service is requested.
        ...(serviceCode ? { Service: { Code: serviceCode } } : {}),
        Package: packages.map((pkg) => ({
          PackagingType: { Code: "02" }, // Customer Supplied Package
          Dimensions: {
            UnitOfMeasurement: { Code: "IN" },
            Length: String(pkg.lengthIn),
            Width: String(pkg.widthIn),
            Height: String(pkg.heightIn),
          },
          PackageWeight: {
            UnitOfMeasurement: { Code: "LBS" },
            Weight: String(pkg.weightLbs),
          },
        })),
      },
    },
  };
}

export class UpsCarrier implements Carrier {
  private readonly apiVersion: string;

  constructor(apiVersion = "v2403") {
    this.apiVersion = apiVersion;
  }

  async getRates(request: RateRequest): Promise<RateQuote[]> {
    const token = await getAccessToken();
    const requestOption = request.serviceCode ? "Rate" : "Shop";
    const path = `/api/rating/${this.apiVersion}/${requestOption}`;
    const payload = buildRatePayload(request);

    const raw = await upsRequest(path, payload, token);

    // Validate the UPS response shape before consuming it.
    const parsed = UpsRateResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ShippingError(
        ErrorCode.INVALID_RESPONSE,
        "UPS returned unexpected data",
        parsed.error.issues,
      );
    }

    return parsed.data.RateResponse.RatedShipment.map((shipment) => ({
      carrier: "ups",
      serviceCode: shipment.Service.Code,
      serviceName:
        shipment.Service.Description ??
        UPS_SERVICE_NAMES[shipment.Service.Code] ??
        `UPS Service ${shipment.Service.Code}`,
      currency: shipment.TotalCharges.CurrencyCode,
      totalCharge: shipment.TotalCharges.MonetaryValue,
    }));
  }

  async track(_trackingNumber: string): Promise<TrackingResult> {
    throw new ShippingError(
      ErrorCode.NOT_IMPLEMENTED,
      "UPS tracking is not yet implemented",
    );
  }

  async purchaseLabel(_request: LabelRequest): Promise<Label> {
    throw new ShippingError(
      ErrorCode.NOT_IMPLEMENTED,
      "UPS label purchase is not yet implemented",
    );
  }

  async validateAddress(_address: Address): Promise<AddressValidationResult> {
    throw new ShippingError(
      ErrorCode.NOT_IMPLEMENTED,
      "UPS address validation is not yet implemented",
    );
  }
}
