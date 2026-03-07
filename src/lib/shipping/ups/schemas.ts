import { z } from "zod";

// ─── UPS Rate API response structure ─────────────────────────────────────────
// Only the fields we actually consume are modelled here.

const MonetaryValueSchema = z.object({
  CurrencyCode: z.string(),
  MonetaryValue: z.string(),
});

const ServiceSchema = z.object({
  Code: z.string(),
  Description: z.string().optional(),
});

export const RatedShipmentSchema = z.object({
  Service: ServiceSchema,
  TotalCharges: MonetaryValueSchema,
});

export const UpsRateResponseSchema = z.object({
  RateResponse: z.object({
    Response: z.object({
      ResponseStatus: z.object({
        Code: z.string(),
        Description: z.string().optional(),
      }),
    }),
    RatedShipment: z
      .array(RatedShipmentSchema)
      .min(1, "UPS returned no rated shipments"),
  }),
});

export type UpsRateResponse = z.infer<typeof UpsRateResponseSchema>;
