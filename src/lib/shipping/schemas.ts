import { z } from "zod";

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const AddressSchema = z.object({
  name: z.string().optional(),
  addressLines: z
    .array(z.string().min(1))
    .min(1, "At least one address line is required")
    .max(2, "At most 2 address lines are supported"),
  city: z.string().min(1, "City is required"),
  stateCode: z.string().min(1, "State/province code is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  countryCode: z
    .string()
    .length(2, "Country code must be a 2-letter ISO 3166-1 alpha-2 code")
    .toUpperCase(),
});

const PackageSchema = z.object({
  weightLbs: z.number().positive("Weight must be a positive number"),
  lengthIn: z.number().positive("Length must be a positive number"),
  widthIn: z.number().positive("Width must be a positive number"),
  heightIn: z.number().positive("Height must be a positive number"),
});

// ─── Root schema ─────────────────────────────────────────────────────────────

export const RateRequestSchema = z.object({
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1, "At least one package is required"),
  serviceCode: z.string().optional(),
  /**
   * One or more registered carrier names to shop.
   * Defaults to ["ups"] when omitted.
   */
  carriers: z
    .array(z.string().min(1))
    .min(1, "At least one carrier is required")
    .default(["ups"]),
});

export type RateRequestInput = z.infer<typeof RateRequestSchema>;
