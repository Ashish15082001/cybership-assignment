import { z } from "zod";

const UpsConfigSchema = z.object({
  clientId: z.string().min(1, "UPS_CLIENT_ID is required"),
  clientSecret: z.string().min(1, "UPS_CLIENT_SECRET is required"),
  baseUrl: z
    .string()
    .url("UPS_BASE_URL must be a valid URL")
    .default("https://wwwcie.ups.com"),
  shipperNumber: z.string().min(1, "UPS_SHIPPER_NUMBER is required"),
});

function loadUpsConfig() {
  const result = UpsConfigSchema.safeParse({
    clientId: process.env.UPS_CLIENT_ID,
    clientSecret: process.env.UPS_CLIENT_SECRET,
    baseUrl: process.env.UPS_BASE_URL,
    shipperNumber: process.env.UPS_SHIPPER_NUMBER,
  });

  if (!result.success) {
    const missing = result.error.issues.map((i) => i.message).join("; ");
    throw new Error(`UPS configuration error: ${missing}`);
  }

  return result.data;
}

/**
 * Validated UPS configuration loaded from environment variables.
 * Throws at module import time if required variables are missing.
 */
export const upsConfig = loadUpsConfig();
